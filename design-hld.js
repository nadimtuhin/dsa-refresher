// System design problems, standard layout data: functional / non functional requirements,
// and the high level design as request paths (drawn as boxes and arrows, no diagram library).
// Each path step: [component, what it does there].
export const hld = {
  "url-shortener": {
    fr: ["Create a short link for a long URL, with an optional custom alias and expiry.", "Visiting the short link redirects to the long URL.", "Owners can see click counts."],
    nfr: ["Redirects are fast: under 50 ms at p99.", "Very read heavy: 100 reads per write.", "Available above all: a dead link breaks someone's page.", "A short code never points to two URLs."],
    paths: {
      "Create a link": [["Client", "POST /urls with the long URL"], ["API server", "validates the URL, takes the next id from its block"], ["Base62 encode", "id 125,000,000 becomes a 5 to 7 character code"], ["Postgres: urls", "insert code to long URL"]],
      "Follow a link": [["Browser", "GET /3xYz9"], ["CDN", "hit? answer the 302 from the edge"], ["Redirect service", "on a miss"], ["Redis", "code to URL, most hits stop here"], ["Postgres replica", "only on a cache miss, then fill Redis"]],
      "Count clicks": [["Redirect service", "emits a click event, never waits"], ["Kafka", "durable log of clicks"], ["Batch counter", "adds up every minute"], ["Stats table", "one write per link per minute"]]
    }
  },
  "rate-limiter": {
    fr: ["Each API key gets at most N requests per minute.", "Over the limit: answer 429 with Retry-After.", "Limits can differ per plan."],
    nfr: ["Adds under 1 ms to each request.", "Correct across the whole fleet, not per server.", "If the limiter breaks, the API keeps working (fail open)."],
    paths: {
      "Every request": [["Client", "request with an API key"], ["API server middleware", "builds the key rl:{key}:{minute}"], ["Redis", "Lua script: read both windows, increment, in one step"], ["Decision", "under the limit: pass on; over: 429 + Retry-After"], ["Your handler", "only allowed requests reach it"]]
    }
  },
  "webhooks": {
    fr: ["When an event happens, notify each subscribed customer by webhook, email or push.", "Retry failed deliveries for up to 3 days.", "Customers can see delivery logs and replay an event."],
    nfr: ["No lost events, even if a server dies.", "One slow customer never delays the others.", "Customers can verify a webhook really came from us."],
    paths: {
      "Event to delivery": [["Business service", "writes its change and an outbox row in one transaction"], ["Outbox relay", "publishes new outbox rows"], ["Queue", "one delivery job per subscribed endpoint"], ["Delivery workers", "sign with HMAC, POST with a short timeout"], ["Customer endpoint", "2xx: done; error: schedule a retry"]],
      "Retry": [["deliveries table", "next_attempt_at with backoff and jitter"], ["Scheduler", "picks due retries"], ["Per endpoint queue", "so one slow endpoint only blocks itself"], ["Dead letter list", "after the last try, shown to the customer"]]
    }
  },
  "job-dispatch": {
    fr: ["Businesses post jobs with a place, a time window and needed skills.", "Nearby qualified workers see the job and can accept it.", "Exactly one worker gets each job."],
    nfr: ["A new job reaches nearby workers within seconds.", "Never assign one job to two workers.", "Location updates are frequent and cheap to drop."],
    paths: {
      "Post and offer": [["Business app", "POST /jobs"], ["Job service", "saves the job as open, with an outbox event"], ["Matcher", "finds qualified workers in nearby geo cells"], ["Redis GEO", "latest worker locations"], ["Push service", "offers the job to a few workers at a time"]],
      "Accept": [["Worker app", "POST /jobs/1/accept"], ["Job service", "UPDATE ... WHERE status = 'open'"], ["Postgres", "1 row changed: you win; 0 rows: already taken"], ["Job events", "state change recorded, others notified"]]
    }
  },
  "news-feed": {
    fr: ["Users follow other users.", "The home feed shows recent posts from people you follow, newest first.", "Scroll back with paging."],
    nfr: ["Feed loads in under 200 ms.", "A new post can take a few seconds to show up (eventual consistency is fine).", "Works for accounts with millions of followers."],
    paths: {
      "Post": [["Client", "POST /posts"], ["Post service", "saves the post, sharded by author"], ["Fan-out queue", "for normal accounts only"], ["Fan-out workers", "push the post id into each follower's feed"], ["Redis feed lists", "feed:{user}, capped at about 800 ids"]],
      "Read feed": [["Client", "GET /feed?cursor=..."], ["Feed service", "reads the user's Redis list"], ["Celebrity merge", "pulls recent posts from huge accounts you follow"], ["Post cache", "turns ids into full posts"], ["Client", "renders, keeps the cursor for the next page"]]
    }
  },
  "chat": {
    fr: ["One to one and group messages delivered in real time.", "Offline users get messages when they come back, plus a push notification.", "History is kept and synced across devices."],
    nfr: ["Delivery under a few hundred ms for online users.", "Messages appear in the same order for everyone in a chat.", "No lost and no duplicated messages."],
    paths: {
      "Send": [["Sender phone", "WebSocket: message with a client id"], ["Gateway server", "holds the open connection"], ["Chat service", "assigns the next seq for this chat, saves it"], ["Messages store", "PRIMARY KEY (conv_id, seq)"], ["Ack to sender", "with the seq, so a resend is ignored"]],
      "Deliver": [["Chat service", "looks up each member"], ["Presence (Redis)", "which gateway each online user is on"], ["Pub/sub", "message to those gateways"], ["Receiver phone", "shows in seq order, asks for any gap"], ["Push service", "for members who are offline"]]
    }
  },
  "app-builder": {
    fr: ["Describe an app in plain words and get working code plus a live preview.", "Chat to change it; see changes as the AI makes them.", "Undo to any earlier version; deploy with one click."],
    nfr: ["First preview in under a minute; edits show in seconds.", "Users never see a broken build.", "Generated code is untrusted: run it isolated, with no secrets.", "Model cost is capped per user."],
    paths: {
      "Prompt to preview": [["Browser", "sends the chat message"], ["Orchestrator", "picks relevant files, builds the prompt"], ["LLM", "streams back search and replace edits"], ["Edit applier", "applies all edits or none"], ["Sandbox (warm pool)", "runs the build; errors go back to the LLM, max 3 tries"], ["Version store", "saves the working tree as a new version"], ["Browser", "preview iframe reloads"]],
      "Undo and deploy": [["Browser", "pick version 4"], ["Version store", "versions are never changed, so restore is a pointer move"], ["Static build", "for deploy"], ["CDN", "serves the published app"]]
    }
  },
  "ride-sharing": {
    fr: ["Riders request a ride and see the price first.", "Nearby drivers are offered the ride; exactly one gets it.", "Both see each other live on a map until drop off.", "Price rises when riders outnumber drivers in an area."],
    nfr: ["Match within a few seconds.", "Never assign one ride to two drivers.", "Handle about 50k location updates per second.", "Location data can be lost; rides and payments can't."],
    paths: {
      "Request a ride": [["Rider app", "POST /rides with pickup and drop off"], ["Ride service", "gets the surge price for the area, saves the ride as requested"], ["Matcher", "finds free drivers in nearby map cells"], ["Redis GEO", "latest driver positions"], ["Routing service", "ranks candidates by road ETA"], ["Push", "offer to the best driver, 15 s timeout, then the next"]],
      "Accept and ride": [["Driver app", "POST /rides/1/accept"], ["Ride service", "UPDATE ... WHERE status = 'requested'"], ["Pub/sub", "driver position forwarded to the rider every few seconds"], ["Ride events", "each state change, outbox to payments and receipts"]],
      "Location updates": [["Driver app", "GPS every 4 s over a socket"], ["Location service", "overwrite in Redis GEO, expire after 30 s"], ["Surge job", "every minute: requests vs free drivers per area"]]
    }
  },
  "food-delivery": {
    fr: ["Customers order from a restaurant and pay.", "The restaurant accepts and cooks; a rider picks up and delivers.", "Everyone sees the status live.", "Cancel is allowed only before cooking starts."],
    nfr: ["Survive lunch and dinner peaks (60% of orders).", "No step can be skipped or reversed.", "Riders shouldn't wait at restaurants, food shouldn't wait for riders.", "One order per tap, even on bad networks."],
    paths: {
      "Place an order": [["Customer app", "POST /orders with an idempotency key"], ["Order service", "copies item prices onto the order, saves it as placed"], ["Payments", "authorise the card"], ["Restaurant tablet", "new order pushed; accept or reject"]],
      "Cook and deliver": [["Restaurant", "accepted, then preparing"], ["Dispatch (per city queue)", "sends a rider at ready time minus travel time"], ["Rider app", "ready, picked up, delivered: each a checked state change"], ["Order events", "live status for the customer, outbox to payouts"]]
    }
  },
  "courier-tracking": {
    fr: ["Merchants book parcels and get a tracking code.", "Each hand off is scanned: pickup, hub in, hub out, out for delivery.", "Customers track the parcel and the rider live.", "Delivery needs the customer's one time code."],
    nfr: ["Tracking history is complete and in order.", "Late and duplicate GPS pings don't confuse the map.", "Works offline on the rider's phone and syncs later.", "Easy on the phone's battery and data."],
    paths: {
      "Scan a parcel": [["Hub or rider app", "POST /scans with parcel, hub and kind"], ["Parcel service", "checks the scan fits the route"], ["parcel_events", "appends the event: the tracking history"], ["parcels", "status updated from the event"], ["Notifications", "SMS at key steps"]],
      "Live position": [["Rider phone", "batched GPS pings with phone time"], ["Tracking service", "newest per rider wins, late ones go to the trail, duplicates dropped"], ["Redis", "live dot per rider"], ["Tracking page", "shows the dot while out for delivery"]],
      "Deliver": [["Customer", "reads out the SMS code"], ["Rider app", "POST /parcels/1/deliver with the code and a photo"], ["Parcel service", "compares against the stored hash"], ["parcel_events", "delivered, with time and position"]]
    }
  },
  twitter: {
    fr: ["Post short tweets with media.", "Follow and unfollow people.", "Home timeline: tweets from people you follow, newest first.", "Like and reply."],
    nfr: ["Timeline loads in under 200 ms at 600k reads per second.", "A tweet may take a few seconds to reach timelines.", "Accounts with 100M followers must not melt the system.", "Ids must sort by time without a central counter."],
    paths: {
      "Post a tweet": [["Client", "POST /tweets"], ["Tweet service", "makes a snowflake id, saves the tweet"], ["Fan out queue", "skipped for huge accounts"], ["Fan out workers", "push the id into each follower's timeline list"], ["Redis timelines", "about 800 ids per user"]],
      "Read the timeline": [["Client", "GET /timeline/home"], ["Timeline service", "reads the user's id list"], ["Celebrity merge", "adds recent tweets from huge accounts you follow"], ["Tweet cache", "ids to full tweets in one multi get"], ["CDN", "images and video"]]
    }
  },
  facebook: {
    fr: ["Add friends and post with an audience.", "A ranked news feed.", "People you may know.", "Likes and comments."],
    nfr: ["Feed in under 300 ms for 2B daily users.", "Never show a post to someone outside its audience.", "The friend graph handles billions of reads.", "Graceful fallback when ranking is slow."],
    paths: {
      "Load the feed": [["Client", "GET /feed"], ["Feed service", "gathers candidate posts from friends and pages"], ["Graph cache (TAO style)", "who are my friends, what did they post"], ["Privacy filter", "drops posts you can't see"], ["Ranker", "closeness x engagement / age, keep the top 20"], ["Client", "renders, cursor for more"]],
      "Suggest friends": [["Daily batch", "friends of friends per user"], ["Count mutual friends", "skip current friends and blocks"], ["Suggestions store", "top results per user"], ["Client", "GET /suggestions"]]
    }
  },
  chatgpt: {
    fr: ["Chat with a model; answers stream as they are made.", "Conversations are saved and listed.", "Stop and regenerate.", "Free and paid tiers with different limits."],
    nfr: ["First token in under a second.", "GPUs are scarce: share them fairly.", "Cost per message under control.", "Private: users can delete their data."],
    paths: {
      "Send a message": [["Browser", "POST message, keeps the stream open"], ["API server", "auth, token based rate limit by tier"], ["Context builder", "system prompt + newest messages that fit the budget"], ["Queue", "per tier priority"], ["Model servers (GPU)", "batch requests, generate token by token"], ["Browser", "shows tokens as server sent events arrive"]],
      "Save": [["API server", "writes the user message and the final answer with seq numbers"], ["Usage table", "tokens per user per day"], ["Title job", "names the conversation in the background"]]
    }
  },
  "coding-harness": {
    fr: ["Take a coding task in plain words.", "Read, search and edit files; run commands and tests.", "Show each step; ask before risky actions.", "Undo changes."],
    nfr: ["Never runs a denied command, whatever the model says.", "Stops on step, time and cost limits.", "Fits work into the model's context window.", "Recovers from tool errors instead of crashing."],
    paths: {
      "One loop step": [["Developer", "gives the task"], ["Harness", "sends task, tool list and project notes to the model"], ["Model", "replies with a tool call, or done"], ["Permission check", "allow list, approval prompt, or deny"], ["Tool runner", "runs with a timeout in a sandbox, trims long output"], ["Harness", "adds the result to the log and loops"]],
      "Finish": [["Model", "says done"], ["Harness", "runs the tests"], ["Checkpoints", "file snapshots for undo"], ["Developer", "reviews the diff"]]
    }
  }
};

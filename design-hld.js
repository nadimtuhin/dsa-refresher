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
  }
};

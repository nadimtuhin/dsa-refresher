// Part 3 stories: system design ideas told as everyday situations, with real product examples.
export const storiesD = {
  "d-consistent-hash": {
    story: [
      "A restaurant has 3 waiters and splits tables by number: table 1 to waiter A, 2 to B, 3 to C, 4 to A again (table number divided by 3, look at the remainder). A 4th waiter starts. Now it's \"divided by 4\", and almost every table gets a new waiter. Chaos: nobody knows their orders.",
      "Better: draw a big circle on the floor. Put each waiter at a few spots on it. Each table walks clockwise to the nearest waiter. When the new waiter arrives, he only takes the tables just before his spots. Everyone else keeps their waiter."
    ],
    examples: [
      "Cache servers: add one, and only about 1 in 4 keys move, instead of 3 in 4.",
      "DynamoDB and Cassandra place data this way.",
      "Discord routes each chat server (guild) to one machine with a ring.",
      "Each server sits on the circle many times (virtual nodes) so the slices are even."
    ]
  },
  "d-cache-aside": {
    story: [
      "A tea stall owner keeps a small whiteboard of today's prices so he doesn't phone the wholesaler for every customer. Someone asks for sugar: is it on the board? Yes, answer fast. No? Phone, then write it on the board. Each entry gets wiped at closing time anyway, in case he forgot to fix it.",
      "When the price changes, he wipes that line instead of writing the new price, so two calls arriving out of order can't leave the old price on the board."
    ],
    examples: [
      "Profile pages: read from Redis, fall back to Postgres, store with a 5 minute expiry.",
      "Update flow: write the database first, then delete the cache key.",
      "Expiry (TTL) is the safety net if a delete is ever lost.",
      "Thundering herd: a popular key expires and 1,000 requests hit the database at once. Let one request reload it while the rest wait."
    ]
  },
  "d-quorum": {
    story: [
      "Three friends each keep a copy of the group's shared expense notebook. To save a new expense you only wait for 2 of them to say \"written\". To read, you ask any 2 and believe the one with the newest page number.",
      "Any 2 out of 3 always includes at least one friend who saw the latest write. That's why the rule is: readers plus writers must be more than the number of copies (2 + 2 > 3)."
    ],
    examples: [
      "N = 3, W = 2, R = 2: survives one friend being offline for both reads and writes.",
      "W = 1, R = 1: fast, but a read may miss the newest write.",
      "W = 3, R = 1: every read is fresh, but one slow friend slows every write.",
      "Cassandra lets you pick these numbers per request (QUORUM, ONE, ALL)."
    ]
  },
  "d-keyset": {
    story: [
      "You're reading Facebook comments 10 at a time. While you read page 1, 3 new comments arrive at the top. You tap \"page 2\" (skip 10, show 10) and see 3 comments you already read, because everything shifted down.",
      "Fix: instead of \"skip 10\", say \"show comments older than the last one I saw\". New arrivals can't shift that."
    ],
    examples: [
      "Offset: SELECT ... LIMIT 10 OFFSET 10000 reads and throws away 10,000 rows. Slow deep in the list.",
      "Cursor: WHERE (created_at, id) < (last_time, last_id) LIMIT 10. Same speed on page 1 or page 10,000.",
      "Twitter, Slack and Stripe APIs all return a \"next cursor\", not a page number.",
      "Add the id to the cursor so two rows with the same time can't be skipped."
    ]
  },
  "d-idempotency": {
    story: [
      "You pay for a ride with bKash. You tap Pay, the screen spins, the network drops. Did it go through? You tap Pay again. Without protection, you pay twice.",
      "The fix: the app makes up a ticket number before the first tap and sends it every time. The server keeps \"ticket number to result\". The second tap with the same ticket gets back the saved result. No second charge."
    ],
    examples: [
      "Stripe: send Idempotency-Key: abc123 with POST /payments; a retry returns the first response.",
      "Same key, different amount: reject it; that's a bug, not a retry.",
      "Keep keys for about 24 hours, then delete them.",
      "Also works for \"create order\", \"send SMS\", \"book seat\": anything that must not happen twice."
    ]
  },
  "d-outbox": {
    story: [
      "A shop takes an order and must also tell the warehouse. If it saves the order and then the phone call to the warehouse fails, the customer paid but nothing ships. If it calls first and then saving fails, the warehouse ships an order that doesn't exist.",
      "The fix: write the order AND a note \"tell the warehouse about order 7\" in the same notebook, at the same moment. A helper reads the notes and makes the calls, ticking each off. If the helper crashes, he redoes unticked notes, so the warehouse ignores repeats by order number."
    ],
    examples: [
      "Postgres: insert into orders and outbox in one transaction.",
      "A relay process reads the outbox and publishes to Kafka or SQS.",
      "Delivery is \"at least once\", so consumers skip event ids they've already handled.",
      "Debezium does this by reading the database's change log."
    ]
  },
  "d-retry-breaker": {
    story: [
      "Your friend isn't picking up the phone. You don't call 100 times in a row: you wait 1 minute, then 2, then 4. If 5 calls in a row fail, you stop calling for an hour and assume they're busy. After the hour, you try once. If they answer, back to normal.",
      "Waiting longer each time is backoff. Randomising the wait (jitter) stops everyone retrying at the same second. Stopping for a while is the circuit breaker."
    ],
    examples: [
      "Retries: wait 100 ms, 200, 400, 800, capped at a few seconds, with random jitter.",
      "Breaker open: fail fast instead of tying up threads on a dead service.",
      "Only retry what may fix itself (timeouts, 503, 429), never 400 Bad Request.",
      "AWS SDKs, Netflix Hystrix and Resilience4j all do this."
    ]
  },
  "d-url-shortener": {
    story: [
      "A cloakroom. You hand in a coat (a long URL) and get a small ticket (a short code). Later you show the ticket and get the coat back. Tickets are numbered 1, 2, 3... and the number is written in a short alphabet (0-9, a-z, A-Z: 62 symbols) so it stays tiny.",
      "Reading the coat back is most of the work, so it's cached."
    ],
    examples: [
      "Number 125,000,000 in base 62 is just 5 characters.",
      "bit.ly/3xYz9 looks up 3xYz9 and answers \"302, go to this long URL\".",
      "7 characters give 3.5 trillion codes.",
      "Sequential codes are guessable; shuffle the numbers if links must be private."
    ]
  },
  "d-rate-limiter": {
    story: [
      "A gym allows 3 visits per hour per member. A guard at the door counts. A simple counter that resets each hour has a gap: 3 visits at 9:59 and 3 more at 10:00 is 6 in two minutes.",
      "The sliding window fixes it by blending: at 10:30, count half of last hour's visits plus this hour's. Closer to real \"last 60 minutes\", using just two numbers."
    ],
    examples: [
      "GitHub API: 5,000 requests per hour per token.",
      "Answer 429 Too Many Requests with a Retry-After header.",
      "Store counters in Redis (INCR with expiry) so all servers share them.",
      "Token bucket is the other common choice: allows bursts, then a steady rate."
    ]
  },
  "d-webhooks": {
    story: [
      "A courier delivers a parcel (an event) to a customer's house (their server). Nobody answers? Come back later, then later again, waiting longer each time. Address doesn't exist? Stop trying and send it to the return office for a human to look at.",
      "Each parcel has a tracking number so the customer can tell if the same parcel arrived twice, and a seal so they know it really came from you."
    ],
    examples: [
      "Stripe: \"payment succeeded\" sent to your server, retried for up to 3 days.",
      "Retry on timeout, 500, 429. Stop on 400 or 404: retrying won't fix those.",
      "Signature: HMAC of timestamp + body with a shared secret, header like t=...,v1=....",
      "Reject old timestamps so someone can't replay a captured request."
    ]
  },
  "d-job-dispatch": {
    story: [
      "A ride app: a customer books a ride. You don't ask every driver in the country. Split the map into squares, look at the customer's square and the 8 around it, and offer the ride to the few drivers there.",
      "Two drivers tap Accept at the same moment. Only one can win. The database update says \"assign me only if the job is still open\". The first update changes 1 row and wins; the second changes 0 rows and gets \"already taken\"."
    ],
    examples: [
      "Uber uses H3 hexagons; others use geohash or PostGIS.",
      "UPDATE jobs SET driver = 7 WHERE id = 1 AND status = 'open'.",
      "Offer to a few drivers at a time, not all at once, so most don't see a ride disappear.",
      "Drivers send location every few seconds; keep it in Redis with a short expiry."
    ]
  },
  "d-news-feed": {
    story: [
      "A newspaper delivery boy. For most people, when they write a post, you drop a copy in each follower's mailbox right away. Reading is fast: just open your mailbox.",
      "But a celebrity with 5 million followers would need 5 million deliveries per post. So for celebrities you don't deliver: when a follower opens the app, you fetch the celebrity's latest posts and mix them into the mailbox."
    ],
    examples: [
      "Push (fan-out on write) for normal accounts: a post goes into each follower's Redis list.",
      "Pull (fan-out on read) for huge accounts, merged at read time.",
      "Store post ids in feeds, not full posts, so edits show up everywhere.",
      "Twitter and Instagram use this mix."
    ]
  },
  "d-chat": {
    story: [
      "WhatsApp on a bad network. Messages 1, 3 and 2 arrive in that order, and 3 arrives twice. Every message in a chat has a number from the server. The phone shows 1, keeps 3 waiting, shows 2 and 3 when 2 arrives, and ignores the extra 3.",
      "If 4 never comes, the phone notices the gap and asks the server for \"everything after 3\"."
    ],
    examples: [
      "Each phone keeps a WebSocket open to a gateway server.",
      "A presence map in Redis says which gateway each online user is on.",
      "Offline? Store the message and send a push notification.",
      "The client sends its own message id so a resend after a lost ack isn't posted twice."
    ]
  },
  "d-app-builder": {
    story: [
      "A salon owner types \"a booking site for my salon\". 30 seconds later she sees a working site. She types \"make the header pink\". The AI doesn't rewrite the whole site; it sends small edits: \"find this line, replace with this\". If the edit points at a line that doesn't exist, or the site doesn't build, the error goes back to the AI to fix, up to 3 tries. She never sees a broken page.",
      "Every working version is saved forever, like save points in a game. \"Undo\" just loads an older save. The live preview runs in a small sandbox computer, and a few are kept warm so she doesn't wait for one to start."
    ],
    examples: [
      "Lovable, Bolt and v0 all work roughly like this.",
      "Edit format: { file: \"App.jsx\", search: \"<h1>Hi</h1>\", replace: \"<h1>Salon</h1>\" }.",
      "Build check: run the bundler; on error, send the error text to the model.",
      "Sandboxes: Firecracker microVMs or containers, no secrets inside, stopped after 10 idle minutes."
    ]
  },
  "d-ride-sharing": {
    story: [
      "It's raining at Gulshan 1 at 6 pm. You open the app and tap Request. Behind the screen, the app looks at your square of the map and the squares around it, finds drivers who are free, and asks the one with the shortest drive to you first. He has 15 seconds to say yes. If he doesn't, the next driver gets asked.",
      "Because of the rain, 30 people asked for a ride and only 10 drivers are free nearby. So the price goes up a step, say to 1.5x. That pulls more drivers toward Gulshan and makes some riders wait. You see the higher price before you book, and it is locked onto your ride."
    ],
    examples: [
      "Uber, Lyft and Grab all match by area cells first, then by road time, not straight line distance.",
      "Two drivers tap Accept at once: a conditional database update lets only the first one win.",
      "Driver locations update every few seconds and are thrown away after; only the latest matters.",
      "Surge is recalculated every minute per area and capped, so prices can't run away."
    ]
  },
  "d-food-delivery": {
    story: [
      "You order kacchi biryani at 1 pm. The order is placed, then the restaurant accepts it, then the kitchen starts cooking. At this point you try to cancel, and the app says no: the rice is already in the pot. Every order walks through the same fixed steps, and the system refuses any jump that doesn't make sense, like delivered before picked up.",
      "The biryani will be ready in 20 minutes and the nearest rider is 8 minutes away. If the rider is sent now, he stands in the restaurant for 12 minutes. So the system waits and sends him at minute 12. He walks in just as the box is sealed."
    ],
    examples: [
      "Foodpanda, Uber Eats and DoorDash all model an order as a state machine.",
      "The price of each item is copied onto your order, so a menu change a minute later doesn't change your bill.",
      "Lunch and dinner peaks are 60% of the day's orders: menus come from cache, ordering is a tiny write.",
      "Pressing Pay twice on a bad network sends the same idempotency key, so you get one order, not two."
    ]
  },
  "d-courier-tracking": {
    story: [
      "A Facebook shop in Mirpur sends you a parcel. A rider picks it up and scans it. At the hub it's scanned again in, then out, then onto a delivery rider's bike. Each scan adds a line to the parcel's history, which is what you see when you open the tracking link.",
      "The delivery rider's phone sends its location every few seconds. On a weak network, the 2:03 ping arrives after the 2:05 one, and the 2:05 one arrives twice. The map keeps the newest one as the moving dot, puts the late one in the trail where it belongs, and ignores the copy. At your door, the rider asks for the 4 digit code from your SMS. Wrong code, no delivery."
    ],
    examples: [
      "Courier companies like DHL and FedEx work from scan events at each hand off.",
      "Phones batch GPS pings and send them every 30 s to save battery, more often near the customer.",
      "The delivery code is stored only as a hash, so staff can't read it from the database.",
      "Failed attempts are events too: not home, reschedule, and after 3 tries, return to the merchant."
    ]
  },
  "d-twitter": {
    story: [
      "You follow 300 people. When you open the app, the newest tweets from all of them must appear in under a second. Reading 300 lists and sorting everything every time would be far too slow at 600,000 timeline reads a second.",
      "So the work is done ahead of time: when your friend tweets, the tweet's id is dropped into your timeline list right away, like a newspaper boy putting a paper in every subscriber's box. Except for accounts with 100 million followers: their tweets aren't delivered to 100 million boxes. When you open the app, the system grabs their latest few and mixes them in."
    ],
    examples: [
      "Twitter keeps about 800 tweet ids per user's timeline in Redis.",
      "Tweet ids are snowflakes: the time comes first, so sorting by id is sorting by time.",
      "A celebrity tweet costs one write instead of 100 million.",
      "Like counts on a viral tweet go to several counters that are added up, so no single row melts."
    ]
  },
  "d-facebook": {
    story: [
      "Your feed isn't newest first. Facebook gathers a few thousand recent posts from friends and pages, drops anything you're not allowed to see, then scores each one: how close you are to the person, how much people are reacting, how old it is. You see the top 20.",
      "People you may know works like a party. You know Ana and Bob. Ana and Bob both know Cat. You've never met Cat, but two of your friends have, so Cat goes at the top of your suggestions."
    ],
    examples: [
      "A post from your sister an hour ago beats a two day old post from someone you never talk to.",
      "A post with 200 likes can beat a close friend's quiet post.",
      "The friend graph is stored as edges sharded by user, behind a huge cache (Facebook's is called TAO).",
      "If ranking is slow, show a simple newest first feed instead of an empty screen."
    ]
  },
  "d-chatgpt": {
    story: [
      "You ask a question and the answer starts typing itself out almost at once. The model really does make the answer one word at a time, and the app shows each word as it arrives, so you aren't staring at a spinner for 10 seconds.",
      "The model can only read so much at once. If your chat has gone on for an hour, the app keeps the instructions and your most recent messages, and leaves out the oldest ones, like a friend who remembers the last half hour of a conversation but not the start. Behind all of it are GPUs, which are expensive and limited, so requests wait in a queue and are run together in batches."
    ],
    examples: [
      "Streaming uses server sent events: one request, many small chunks back.",
      "Limits are counted in tokens, not requests: a 5,000 word question costs more than a hello.",
      "Easy questions can go to a smaller, cheaper model.",
      "Close the tab and generation stops, so no GPU time is wasted."
    ]
  },
  "d-coding-harness": {
    story: [
      "You tell an AI coding agent: set x to 2. It can't touch your files directly. It asks the harness, the program around it: please read b.js. There is no b.js, so the harness sends back an error, and the model tries a.js instead. Then it asks to write the change. Then, oddly, it asks to run rm -rf /. The harness says no. The model never gets the final word on what runs.",
      "Then the model says it's done, and the loop ends. If it never says done, a step limit ends it. The harness also saves a copy of each file before changing it, so anything can be undone, and it runs the tests to check the work instead of trusting the model's word."
    ],
    examples: [
      "Claude Code, Codex CLI and Cursor's agent all run this tool loop.",
      "Reading files is allowed; writing and shell commands need approval or an allow list.",
      "Long command output is trimmed before going back to the model, to save context.",
      "Tool errors go back as text, so the model can try another way instead of crashing."
    ]
  }
};

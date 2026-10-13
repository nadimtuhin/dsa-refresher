// Part 1 stories: one everyday story + concrete examples per concept.
export const storiesC = {
  "c-hash-map": {
    story: [
      "A hotel has 500 rooms. You ask the front desk for a guest called Rahman. The clerk doesn't walk every floor knocking on doors. He looks at a board: Rahman, room 214. One look, done.",
      "A hash map is that board. You give it a name (the key), it turns the name into a slot number, and jumps straight there. It doesn't matter if the hotel has 50 rooms or 50,000: one look."
    ],
    examples: [
      "Phone contacts: type \"Mom\", get her number instantly, no scrolling.",
      "Counting votes: map.set(\"Ana\", map.get(\"Ana\") + 1) each time a ballot says Ana.",
      "Login sessions: the server keeps sessionId to user, so every request finds its user in one step.",
      "Two Sum: remember every number you've seen, then ask \"have I seen the number I need?\" in one step."
    ]
  },
  "c-queue": {
    story: [
      "A bank line. The first person in is the first person served. Newcomers join at the back. Nobody jumps the line.",
      "That's a queue: add at the back, take from the front. It keeps things fair and in arrival order."
    ],
    examples: [
      "A printer prints jobs in the order they were sent.",
      "Breadth first search: visit everything 1 step away, then everything 2 steps away, like ripples in water.",
      "Background jobs: \"send welcome email\" waits in a queue until a worker is free.",
      "The trap: in JavaScript, array.shift() moves every item over. With 1 million people in line, that's slow. Keep a \"head\" number instead."
    ]
  },
  "c-min-heap": {
    story: [
      "A hospital emergency room. Patients don't go in arrival order. The worst injured goes first. When a new patient arrives, the nurse doesn't re-sort the whole waiting room. She just checks: is this one worse than the person ahead? Swap. Is this one worse than the next? Swap. Stop.",
      "A heap is that waiting room. The most urgent item is always at the front, and adding or removing one only takes a few swaps, not a full sort."
    ],
    examples: [
      "Uber: always pick the nearest driver from the current list.",
      "Top 10 scores: keep a heap of 10; a new score only goes in if it beats the smallest of the 10.",
      "Dijkstra: always visit the closest unvisited city next.",
      "Few swaps: with 1 million patients, a new arrival needs at most about 20 swaps. That's what \"log n\" means."
    ]
  },
  "c-traversals": {
    story: [
      "You are checking every room of a big office building. You can do it two ways.",
      "Depth first: take the first corridor and go as deep as it goes, room inside room, then come back and try the next corridor. Breadth first: check every room on floor 1, then every room on floor 2, then floor 3."
    ],
    examples: [
      "Depth first: exploring folders on your laptop, opening each folder all the way down before the next.",
      "Breadth first: \"friends of friends\" on LinkedIn: 1st connections, then 2nd, then 3rd.",
      "Breadth first finds the shortest path in a maze where every step costs the same.",
      "Tree orders: pre order (visit me, then my kids), in order (left kid, me, right kid: gives sorted order in a BST), post order (kids first, then me: like deleting a folder)."
    ]
  },
  "c-bst": {
    story: [
      "A guessing game: I'm thinking of a number from 1 to 100. You guess 50. I say \"higher\". You guess 75. \"Lower\". 62... Every answer throws away half the numbers.",
      "A binary search tree stores data so every lookup plays that game. At each node: smaller goes left, bigger goes right. But if you add numbers already sorted (1, 2, 3, 4...), every node goes right and the tree becomes one long line. Then it's slow again, so real systems keep it balanced."
    ],
    examples: [
      "Database indexes (a B+tree is a wide cousin of this) find one row among millions in a few steps.",
      "\"Find all orders between 1 March and 15 March\": a sorted tree walks just that range.",
      "A dictionary book: open the middle, go left or right by the first letter.",
      "Bad case: insert 1, 2, 3, ..., 1000 into a plain BST and you get a 1000 step chain."
    ]
  },
  "c-trie": {
    story: [
      "Your phone keyboard. You type \"ca\" and it suggests cat, car, cart, camera. It doesn't search the whole dictionary each time you press a key. It follows a path: c, then a, and everything below that point starts with \"ca\".",
      "A trie is a tree of letters. Words that share a beginning share a path. Each node marks whether a full word ends there."
    ],
    examples: [
      "Search box autocomplete: \"new y\" shows New York, New Year.",
      "Spell check: walk the letters; if the path breaks, the word isn't in the dictionary.",
      "Network routers match the longest matching IP prefix the same way.",
      "car and cart: the same path, but \"car\" has an \"end of word\" mark at the r."
    ]
  },
  "c-graph": {
    story: [
      "A map of Dhaka. Places are dots (nodes), roads are lines (edges). Some roads are one way (directed), some have a travel time on them (weighted).",
      "A graph is any \"things and the connections between them\". Once you see something as a graph, the same few algorithms solve it."
    ],
    examples: [
      "Facebook: people are nodes, friendships are edges.",
      "Course prerequisites: you need Math 101 before Math 201 (one way edges).",
      "Flights between cities with prices on each edge.",
      "Storing it: an adjacency list is \"for each place, the list of places you can reach\", like each bus stop's sign of next stops."
    ]
  },
  "c-topo-sort": {
    story: [
      "Getting dressed. Socks before shoes. Underwear before trousers. Shirt before tie. You can put on your watch any time. Topological sort finds an order that respects every \"before\".",
      "The method: start with anything that has nothing required before it. Do it, cross it off, and see what's now free. If you get stuck with things left over, there's a loop: A needs B and B needs A. Impossible."
    ],
    examples: [
      "University courses: take the ones with no prerequisites first.",
      "npm install: install packages before the packages that depend on them.",
      "Build tools: compile shared code before the apps that use it.",
      "Spreadsheets: recalculate cell A1 before the cells that use A1."
    ]
  },
  "c-dijkstra": {
    story: [
      "You're at home and want the fastest way to every place in the city. You know your neighbours: shop 2 minutes, school 5 minutes. Go to the closest place you haven't settled yet: the shop. From the shop, the park is 1 more minute, so park = 3. Now the closest unsettled place is the park. Keep going.",
      "Each time you settle the closest place, you're sure no faster route exists, because every other route is already longer. That only works if no road has a negative time."
    ],
    examples: [
      "Google Maps fastest route.",
      "Network routing: send packets along the lowest cost path.",
      "Cheapest flights with layovers, where the price is the edge weight.",
      "Not for negative weights: a \"road\" that gives you time back breaks the \"closest is final\" promise."
    ]
  },
  "c-union-find": {
    story: [
      "A school with 1,000 students. Every so often, two students become friends. The question: \"are Rina and Karim in the same friend group?\" Each group picks one leader. Every student remembers who to ask, and asking up the chain leads to the leader. Same leader means same group.",
      "When two groups meet, one leader just agrees to follow the other. Two shortcuts keep it fast: everyone remembers the final leader directly (path compression), and the small group joins the big one (union by size)."
    ],
    examples: [
      "Social network: are these two people connected through any chain of friends?",
      "Number of Islands: join neighbouring land cells; count how many leaders are left.",
      "Kruskal's cheapest network: add the cheapest cable unless both ends are already connected.",
      "Merging duplicate customer records that share an email or phone."
    ]
  },
  "c-merge-sort": {
    story: [
      "Two teachers each have a pile of exam papers already sorted by score. To make one sorted pile, look at the top paper of each pile, take the lower one, repeat. You never have to look back.",
      "Merge sort uses that trick over and over: split the class into halves, then quarters, down to single papers (one paper is already sorted). Then merge pairs, then pairs of pairs, back up. Always the same speed, and equal scores keep their order."
    ],
    examples: [
      "Sorting a 50 GB log file that doesn't fit in memory: sort chunks, then merge the chunks.",
      "Merge Two Sorted Lists is the merge step on its own.",
      "JavaScript's sort is stable (equal items keep order), using a merge-sort-like algorithm.",
      "Cost: it needs a second pile of the same size while merging."
    ]
  },
  "c-quick-sort": {
    story: [
      "A teacher lines up the class by height. She picks one student, Rafi, and says: shorter than Rafi go to the left, taller go to the right. Rafi is now standing in exactly the right spot. Then she does the same inside each side.",
      "That's quick sort. It's usually very fast. But if she always picks the shortest student as Rafi, nobody goes left and it takes forever, so pick a random student."
    ],
    examples: [
      "Many standard libraries use a version of quick sort for numbers.",
      "Quickselect: find the median without sorting everything, by only going into the side that contains it.",
      "Bad case: an already sorted list with \"first item\" as the pick.",
      "It sorts in place: no second pile needed, unlike merge sort."
    ]
  },
  "c-binary-search": {
    story: [
      "Looking up \"Mango\" in a paper dictionary. Open the middle: \"K\". Mango is after K, so ignore the first half. Open the middle of what's left: \"P\". Go back a bit. A few flips and you're there.",
      "Every step throws away half. A 1,000,000 word dictionary needs only about 20 flips. That shrinking-by-half is where \"log n\" comes from. The one rule: the data must be sorted."
    ],
    examples: [
      "git bisect: find the commit that broke the build among 1,000 commits in about 10 tests.",
      "Find the first day a shop's sales passed 1 million in a sorted list of daily totals.",
      "\"Search on the answer\": the smallest truck that can deliver everything in 5 days. Try a size; too small, go bigger; works, try smaller.",
      "Classic bug: (lo + hi) / 2 on huge numbers, and off-by-one with lo < hi vs lo <= hi."
    ]
  },
  "c-backtracking": {
    story: [
      "A maze. At each fork, pick a path. Hit a dead end? Walk back to the last fork and try the other way. Mark where you've been.",
      "Backtracking is \"try, and undo if it doesn't work\". It explores every choice, but cuts a branch the moment it can't lead anywhere (pruning)."
    ],
    examples: [
      "Sudoku: put a 5 here; later a conflict appears; erase it and try 6.",
      "All the ways to pick 3 toppings out of 8.",
      "Placing 8 queens on a chessboard so none attack each other.",
      "Pruning: if the toppings already cost more than your budget, stop adding more."
    ]
  },
  "c-dp": {
    story: [
      "Climbing 10 stairs, 1 or 2 steps at a time. How many ways? To stand on stair 10, your last move came from stair 9 or stair 8. So ways(10) = ways(9) + ways(8). And ways(9) = ways(8) + ways(7)...",
      "Without a notebook you'd recount ways(8) again and again. Dynamic programming is just writing down each answer the first time, so you never work it out twice."
    ],
    examples: [
      "Making change for 30 taka with the fewest coins.",
      "Spell check \"did you mean\": the fewest edits from one word to another.",
      "Google Maps' route cache: the best route to a junction is reused for every trip through it.",
      "Rule of thumb: if your recursive solution asks the same question many times, add a notebook (memo)."
    ]
  },
  "c-bits": {
    story: [
      "A row of 8 light switches. Each is on (1) or off (0). That row is a number in binary. 00001011 is switches 1, 2 and 4 on, which is 11.",
      "Bit tricks are just flipping and checking switches very fast, all at once."
    ],
    examples: [
      "File permissions: read = 4, write = 2, run = 1. 6 means read and write.",
      "Feature flags: one number stores 32 on/off settings for a user.",
      "x & 1 checks the last switch: 1 means odd, 0 means even.",
      "x & (x - 1) turns off the lowest switch that's on. Repeat and count to know how many are on."
    ]
  },
  "c-lru-cache": {
    story: [
      "Your desk only fits 5 books. The rest are on the library shelf. Each time you use a book, you put it on top of the pile. When you need a 6th book and the desk is full, the one at the bottom (the one you haven't touched the longest) goes back to the shelf.",
      "An LRU cache does exactly that: keep the most recently used items, throw out the least recently used one when full. A map finds a book in one step; a linked list keeps the pile order."
    ],
    examples: [
      "Your browser keeps recently visited pages loaded.",
      "Redis with a memory limit evicts the least recently used keys.",
      "A phone's \"recent apps\" list.",
      "In JavaScript, a Map remembers insertion order, so delete and set again moves a key to the top."
    ]
  },
  "c-token-bucket": {
    story: [
      "A ticket machine at a ride. It prints one ticket every 6 seconds, and holds at most 10. You need a ticket to get on. If the ride was quiet, 10 tickets have piled up, so a group of 10 can rush in at once. After that, people wait for the next ticket.",
      "That's a token bucket: it allows short bursts but a steady average rate."
    ],
    examples: [
      "APIs: \"100 requests a minute, bursts up to 20\".",
      "Login: 5 tries, then one more try every minute.",
      "Network traffic shaping on routers.",
      "No timer needed: when a request comes, work out how many tokens should have dripped in since last time."
    ]
  }
};

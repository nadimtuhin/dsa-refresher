// Start pages: plain reading, no tests. Template literals; ctx supplies counts and the highlighter.
export const startPages = ({ nCon, nPro, nDes, pass, hl, hrefs }) => ({
  start: `<h1>Data structures, algorithms and system design, refreshed</h1>
  <p class="lead">A free study book for coding interviews: ${nCon} concepts, ${nPro} interview problems and ${nDes} system design topics. Every implementation and solution is plain JavaScript with a step by step animation, and all ${pass} tests pass before the site is built.</p>
  <h2>What is in the book?</h2>
  <table>
    <tr><th>Part</th><th>Topics</th><th>What you get on each page</th></tr>
    <tr><td><a href="${hrefs.c}">1. Concepts</a></td><td>${nCon}</td><td>How the structure works inside, what each operation costs, when to use it, tested code, an animation.</td></tr>
    <tr><td><a href="${hrefs.p}">2. Problems</a></td><td>${nPro}</td><td>Easy and easy medium problems grouped by pattern: questions to ask, a hint, the approach, time and space, a tested solution, an animation.</td></tr>
    <tr><td><a href="${hrefs.d}">3. System design</a></td><td>${nDes}</td><td>Building blocks (caching, sharding, idempotency, outbox, retries) and full designs (ride sharing, Twitter, ChatGPT and more) in the standard 8 step order.</td></tr>
  </table>
  <h2>How should you use it?</h2>
  <ol>
    <li>New to the words? Read <a href="words">Words in plain English</a> and <a href="logn">What log n means</a> first.</li>
    <li>For a concept: read "How does it work?", then explain it out loud before looking at the code.</li>
    <li>For a problem: read the prompt, say your questions, try it yourself, then read the hint, the approach and the solution in that order.</li>
    <li>For a design: talk through your own answer first, then compare with the 8 steps on the page.</li>
    <li>Tick the topic done at the bottom. Your progress is saved in this browser.</li>
    <li>Redo any problem you peeked at the next day, from a blank file.</li>
  </ol>
  <h2>Why is every answer tested?</h2>
  <p>Study notes with wrong answers are worse than none. Each solution runs against its test cases on every build, and each animation must end on the same answer the tested code gives. If anything fails, the site isn't published.</p>
  <h2>Who is it for?</h2>
  <p>Engineers getting ready for coding and system design interviews who want plain explanations, with a short story and everyday examples before the technical part. Use the arrow keys, or the Previous and Next links at the bottom of each page, to move through the book.</p>`,
  words: `<h2>Words in plain English</h2>
  <p class="lead">Interview words that sound harder than they are. Each one with a picture you can keep in your head.</p>
  <table>
    <tr><td>Pointer</td><td>Just a number saying "which position I'm looking at", like a finger on a line of text. "Two pointers" means two fingers, for example one at the start and one at the end, walking toward each other. In a linked list, a pointer is "who is next in line", like each person holding the shoulder of the person in front.</td></tr>
    <tr><td>O(1)</td><td>Same speed no matter how big. Looking up a room number on the hotel board: 50 rooms or 50,000, one look.</td></tr>
    <tr><td>O(n)</td><td>Look at everything once. Reading every name on a list of 1,000 takes 1,000 looks.</td></tr>
    <tr><td><a href="logn">O(log n)</a></td><td>Throw away half each step, like the "higher or lower" number guessing game. 1,000 items take about 10 steps, 1 million about 20, 1 billion about 30.</td></tr>
    <tr><td>O(n log n)</td><td>Good sorting. 1 million items, about 20 million steps: fast enough.</td></tr>
    <tr><td>O(n²)</td><td>Compare everything with everything. 1,000 people all shaking hands is about 1 million handshakes. 1 million people: far too slow.</td></tr>
    <tr><td>Hash map</td><td>A lookup board: give a name, get the value in one step. In JavaScript: new Map().</td></tr>
    <tr><td>Set</td><td>A guest list: only answers "is this name on it?". In JavaScript: new Set().</td></tr>
    <tr><td>Stack</td><td>A pile of plates: you add and take from the top only.</td></tr>
    <tr><td>Queue</td><td>A bank line: join at the back, served from the front.</td></tr>
    <tr><td>Recursion</td><td>A function that asks a smaller copy of itself. "How deep is this family tree?" equals 1 plus "how deep is my deepest child's tree?".</td></tr>
    <tr><td>Sliding window</td><td>A frame you slide along a list: grow it on the right, shrink it on the left, never go back.</td></tr>
    <tr><td>In place</td><td>Rearrange inside the same list, without making a copy.</td></tr>
    <tr><td>Memo / dynamic programming</td><td>Write each answer in a notebook the first time, so you never work it out twice.</td></tr>
    <tr><td>Latency</td><td>How long one request takes. Throughput: how many requests per second.</td></tr>
    <tr><td>Cache</td><td>A whiteboard of recent answers kept close, so you don't ask the slow place again.</td></tr>
    <tr><td>Replica</td><td>A copy of the data on another machine, so one machine dying loses nothing.</td></tr>
    <tr><td>Shard</td><td>Splitting data across machines, like A to M in one cabinet and N to Z in another.</td></tr>
    <tr><td>Idempotent</td><td>Doing it twice has the same result as doing it once. Pressing a lift button again doesn't call two lifts.</td></tr>
    <tr><td>Queue (in system design)</td><td>A to-do list between services: one side drops jobs in, workers take them out when free.</td></tr>
    <tr><td>Log (in system design)</td><td>Not a debug log: an append-only list of events in order, like a bank statement. Kafka is one.</td></tr>
    <tr><td>Race condition</td><td>Two people grab the last seat at the same moment, and both think they got it.</td></tr>
  </table>
  <h4>How to read any page in this book</h4>
  <ul><li>Read "In plain words" first: the story is the whole idea.</li><li>Then look at the examples and match each one to the story.</li><li>Only then read "How it works", and watch the animation step by step.</li><li>Close the page and tell the story out loud in your own words. If you can, you know it.</li></ul>`,
  pick: `<h2>Pick a structure from what you need</h2>
  <table>
    <tr><th>I need</th><th>Use</th><th>Cost</th></tr>
    <tr><td>Look up by key, count, dedupe</td><td>Map / Set</td><td>O(1)</td></tr>
    <tr><td>Items in arrival order</td><td>Queue</td><td>O(1)</td></tr>
    <tr><td>Most recent first, undo, matching</td><td>Stack</td><td>O(1)</td></tr>
    <tr><td>Smallest or largest, repeatedly</td><td>Heap</td><td>O(log n)</td></tr>
    <tr><td>Sorted data that changes, ranges</td><td>Balanced BST / B+tree</td><td>O(log n)</td></tr>
    <tr><td>Prefix lookups</td><td>Trie</td><td>O(word length)</td></tr>
    <tr><td>Find in sorted array, minimum that works</td><td>Binary search</td><td>O(log n)</td></tr>
    <tr><td>Fewest hops</td><td>BFS</td><td>O(V + E)</td></tr>
    <tr><td>Cheapest weighted path</td><td>Dijkstra</td><td>O((V + E) log V)</td></tr>
    <tr><td>Order with dependencies</td><td>Topological sort</td><td>O(V + E)</td></tr>
    <tr><td>Merge groups, are they connected</td><td>Union-find</td><td>about O(1)</td></tr>
    <tr><td>All combinations</td><td>Backtracking</td><td>exponential</td></tr>
    <tr><td>Best answer from overlapping subproblems</td><td>DP</td><td>states × work</td></tr>
    <tr><td>O(1) lookup plus O(1) ordering</td><td>Map + doubly linked list (LRU)</td><td>O(1)</td></tr>
  </table>`,
  logn: `<h2>What log n means</h2>
  <p class="what">log n is how many times you can cut n in half before 1 is left. 1,000 halves to 1 in about 10 cuts, 1 million in about 20, and 1 billion in about 30. That's why "O(log n)" is almost as good as instant.</p>
  <div class="story"><h4>In plain words</h4>
  <p>A friend thinks of a number from 1 to 100. You guess 50. "Higher." You guess 75. "Lower." 62... Every answer throws away half of what's left. You'll find it in at most 7 guesses, because 100 halves down to 1 in 7 steps.</p>
  <p>Now make it 1 to 1 million. It feels like it should take forever, but it's only 20 guesses. Double the numbers to 2 million: just 1 more guess. That's the magic of log: making the problem twice as big only adds one step.</p>
  <h4>Examples</h4>
  <ul><li>A paper dictionary with 100,000 words: about 17 flips to find any word.</li><li>git bisect over 1,000 commits: about 10 test runs to find the one that broke the build.</li><li>A database index over 1 billion rows: about 30 comparisons (and only 3 or 4 disk reads, because each B+tree page splits hundreds of ways, not 2).</li><li>A heap with 1 million items: adding one takes at most about 20 swaps.</li><li>A balanced tree of height h holds about 2ʰ items, so height = log₂(items).</li></ul></div>
  <h4>Watch it: halving 16 cards</h4>
  <div class="anim" data-anim="logn-halve"></div>
  <h4>Watch it: guessing a number from 1 to 1,000,000</h4>
  <div class="anim" data-anim="logn-guess"></div>
  <h4>How many steps?</h4>
  <table class="lgtab">
    <tr><th>Items</th><th>Halvings (log n)</th><th>Check every item (n)</th></tr>
    <tr><td>8</td><td>3</td><td>8</td></tr>
    <tr><td>1 thousand</td><td>about 10</td><td>1 thousand</td></tr>
    <tr><td>1 million</td><td>about 20</td><td>1 million</td></tr>
    <tr><td>1 billion</td><td>about 30</td><td>1 billion</td></tr>
  </table>
  <p>Compare everything with everything (n²) for 1 million items: a million million steps (a trillion), versus 20 steps.</p>
  <h4>See the gap</h4>
  <p>Steps for 100 items, drawn to scale.</p>
  <div class="bars" role="img" aria-label="Steps for 100 items: log n is 7, n is 100">
    <div class="bar-row"><span>log n</span><i style="width:7%"></i><b>7</b></div>
    <div class="bar-row"><span>n</span><i style="width:100%"></i><b>100</b></div>
  </div>
  <p>Steps for 1 million items, drawn to scale.</p>
  <div class="bars" role="img" aria-label="Steps for 1 million items: log n is 20, too thin to see; n is 1 million">
    <div class="bar-row"><span>log n</span><i style="width:0.002%"></i><b>20</b></div>
    <div class="bar-row"><span>n</span><i style="width:100%"></i><b>1,000,000</b></div>
  </div>
  <p>At 1 million, the log n bar is 50,000 times shorter than the n bar: too thin to see. The bigger the data, the bigger the win.</p>
  <h4>Where log n shows up</h4>
  <table>
    <tr><td>Binary search</td><td>Halve the sorted list each step.</td></tr>
    <tr><td>Balanced tree, B+tree index</td><td>Each level splits the data; the height is log n.</td></tr>
    <tr><td>Heap push and pop</td><td>An item moves up or down one level per swap; log n levels.</td></tr>
    <tr><td>Merge sort (n log n), quick sort (n log n on average)</td><td>log n levels of splitting, n work on each level.</td></tr>
    <tr><td>Union-find (nearly constant)</td><td>Grows even slower than log n, so treat it as O(1).</td></tr>
  </table>
  <h4>How to spot it in code</h4>
  <ul><li>A loop where the size is divided by 2 (or any fixed number) each time: <code>while (n > 1) n = n / 2</code>.</li><li>A loop where something doubles until it reaches n: <code>for (let i = 1; i < n; i *= 2)</code>.</li><li>Recursion that goes into only ONE half each call (binary search). If it goes into BOTH halves and does n work to combine, that's n log n (merge sort).</li></ul>
  <h4>The code behind the animations (JavaScript, tested)</h4><!--code:halvings-->
  <h4>Things people get wrong</h4>
  <ul><li>The base doesn't matter in Big O: log₂ n and log₁₀ n differ only by a fixed factor (about 3.3), so everyone just writes log n.</li><li>log n needs a shortcut to throw away half: sorted data, a tree shape, a yes/no question that flips once. Unsorted data has no shortcut, so searching it is O(n).</li><li>O(log n) is not "slow-ish O(n)". At 1 billion items, it's 30 steps versus 1 billion.</li></ul>
  <h4>The other "log"</h4>
  <p>In system design, a log means something different: a list of events you only ever add to the end of, in order, like a bank statement. Kafka, a database's write-ahead log and the outbox table are all logs in this sense. Nothing to do with log n.</p>
  <div class="say"><b>Say out loud:</b> Each step throws away half the remaining data, so it takes about log₂ n steps: around 20 for a million items. Doubling the input only adds one step.</div>`,
  bigo: `<h2>Complexity classes</h2>
  <table>
    <tr><th>Big O</th><th>Name</th><th>Typical source</th><th>n = 1M feels like</th></tr>
    <tr><td>O(1)</td><td>constant</td><td>hash lookup, array index</td><td>instant</td></tr>
    <tr><td><a href="logn">O(log n)</a></td><td>logarithmic</td><td>binary search, heap op, B+tree</td><td>~20 steps</td></tr>
    <tr><td>O(n)</td><td>linear</td><td>one pass</td><td>milliseconds</td></tr>
    <tr><td>O(n log n)</td><td>linearithmic</td><td>good sorting</td><td>~20M steps, fine</td></tr>
    <tr><td>O(n²)</td><td>quadratic</td><td>nested loops</td><td>10¹² steps, too slow</td></tr>
    <tr><td>O(2ⁿ), O(n!)</td><td>exponential</td><td>subsets, permutations</td><td>only for n under ~20</td></tr>
  </table>
  <p class="lead">Rough guide from input size: n up to 10⁴ allows O(n²). n up to 10⁶ needs O(n log n) or better.</p>
  <h4>Words interviewers use</h4>
  <table>
    <tr><td>Amortized</td><td>Average cost per operation over a long run. A dynamic array push is O(1) amortized even though a resize is O(n).</td></tr>
    <tr><td>Average vs worst</td><td>Hash map O(1) average, O(n) worst. Quick sort n log n average, n² worst. Say both.</td></tr>
    <tr><td>Space</td><td>Extra memory you allocate, plus recursion depth.</td></tr>
    <tr><td>Stable sort</td><td>Equal items keep their original order.</td></tr>
    <tr><td>In place</td><td>O(1) extra memory, apart from recursion.</td></tr>
  </table>`,
  compare: `<h2>Array vs linked list vs hash map</h2>
  <table>
    <tr><th>Operation</th><th>Array</th><th>Linked list</th><th>Hash map</th></tr>
    <tr><td>Access by index</td><td>O(1)</td><td>O(n)</td><td>n/a</td></tr>
    <tr><td>Search by value</td><td>O(n), O(log n) if sorted</td><td>O(n)</td><td>O(1) by key</td></tr>
    <tr><td>Insert / delete at end</td><td>O(1) amortized</td><td>O(1) with tail</td><td>O(1)</td></tr>
    <tr><td>Insert / delete at front or middle</td><td>O(n), shifts</td><td>O(1) if you hold the node</td><td>O(1)</td></tr>
    <tr><td>Memory</td><td>contiguous, cache friendly</td><td>scattered, a pointer per node</td><td>extra for buckets</td></tr>
  </table>
  <p class="lead">Arrays win most real benchmarks because the CPU cache loves contiguous memory. Linked lists win when you hold node references and splice often, as in an LRU cache.</p>`,
  method: `<h2>The 6 step method (say it out loud)</h2>
  <p>Interviewers grade how you think as much as the code. Narrate everything.</p>
  <table>
    <tr><td>1. Repeat</td><td>"So I get X and return Y." Confirms you understood.</td></tr>
    <tr><td>2. Clarify</td><td>Empty input? Duplicates? Negatives? Sorted? Size of n? Can I modify the input?</td></tr>
    <tr><td>3. Example</td><td>Walk one small example by hand, plus one edge case.</td></tr>
    <tr><td>4. Brute force</td><td>Say it with its Big O. Don't code it unless asked.</td></tr>
    <tr><td>5. Improve, then code</td><td>Name the pattern ("hash map", "two pointers"). Code it clean, with good names.</td></tr>
    <tr><td>6. Test</td><td>Run your example through the code line by line. Then edge cases. Then state time and space.</td></tr>
  </table>
  <h4>Which pattern? Look at the input</h4>
  <table>
    <tr><th>If you see</th><th>Try</th></tr>
    <tr><td>"Have I seen this?", counts, pairs</td><td>Map or Set</td></tr>
    <tr><td>Sorted array, palindrome, in-place rewrite</td><td>Two pointers</td></tr>
    <tr><td>Best substring or subarray</td><td>Sliding window</td></tr>
    <tr><td>Matching pairs, nesting, "most recent"</td><td>Stack</td></tr>
    <tr><td>Sorted plus find, or "minimum X that works"</td><td>Binary search</td></tr>
    <tr><td>Tree depth or path</td><td>Recursion (DFS)</td></tr>
    <tr><td>Level by level, fewest steps</td><td>BFS with a queue</td></tr>
    <tr><td>Grid, connected areas</td><td>DFS or BFS flood fill</td></tr>
    <tr><td>Ranges, meetings, schedules</td><td>Sort by start, then merge</td></tr>
    <tr><td>"How many ways", best value from smaller cases</td><td>DP</td></tr>
  </table>
  <h4>When stuck</h4>
  <ul><li>"Let me try a smaller example." Then do it.</li><li>"I'll start with the brute force so we have something correct, then optimise."</li><li>Ask: "Am I on the right track?" Interviewers usually nudge.</li></ul>`,
  sdmethod: `<h2>System design: the 8 steps</h2>
  <p>A design round is graded on how you drive it. Say each step out loud before doing it, and keep an eye on the time.</p>
  <table>
    <tr><td>1. Requirements</td><td>Functional: what must it do? Non functional: scale, latency, consistency, availability. Ask, don't assume.</td></tr>
    <tr><td>2. Numbers</td><td>Users, requests per second, read to write ratio, storage per year. Round hard; you only need the order of magnitude.</td></tr>
    <tr><td>3. API</td><td>Three to five endpoints or messages. Names and fields make the scope concrete.</td></tr>
    <tr><td>4. Data</td><td>Tables or keys, the primary key, the indexes your queries need. Where each piece of data lives.</td></tr>
    <tr><td>5. High level</td><td>Draw the boxes: client, load balancer, services, database, cache, queue. Walk one request through it.</td></tr>
    <tr><td>6. Deep dives</td><td>Pick the 2 or 3 hardest parts and go deep. Ask: "Which part would you like me to go into?"</td></tr>
    <tr><td>7. Failures</td><td>What breaks at 10x? What if the cache, the queue or a region dies? Retries, idempotency, backpressure.</td></tr>
    <tr><td>8. Trade-offs</td><td>Say what you chose, what you gave up, and what you'd change at the next order of magnitude.</td></tr>
  </table>
  <h4>Numbers worth knowing</h4>
  <table>
    <tr><td>1 day</td><td>about 100k seconds, so 1M a day is about 12 per second</td></tr>
    <tr><td>Memory read</td><td>about 100 ns</td></tr>
    <tr><td>Redis or Memcached call, same zone</td><td>about 0.5 to 1 ms</td></tr>
    <tr><td>Indexed Postgres or MySQL read</td><td>about 1 to 5 ms</td></tr>
    <tr><td>Cross region round trip</td><td>about 50 to 150 ms</td></tr>
    <tr><td>One Postgres primary</td><td>thousands to tens of thousands of simple writes a second</td></tr>
    <tr><td>One Redis instance</td><td>about 100k simple operations a second</td></tr>
    <tr><td>Availability</td><td>99.9% is about 43 minutes down a month, 99.99% about 4</td></tr>
  </table>
  <h4>Phrases that help</h4>
  <ul><li>"Let me check the requirements before I draw anything."</li><li>"I'll start simple and scale it when the numbers force me to."</li><li>"The trade-off here is X for Y. Given what we said about Z, I'd choose X."</li><li>"If this were 10x bigger, the first thing to break would be..."</li></ul>`,
  js: `<h2>JavaScript cheat sheet</h2>
  <div class="cols"><div>
  <pre><code>${hl(`// Map: counts, value -> index
const m = new Map();
m.set(k, (m.get(k) ?? 0) + 1);
m.has(k); m.get(k); m.delete(k);
for (const [k, v] of m) {}
[...m.values()]

// Set
const s = new Set();
s.add(x); s.has(x); s.size;`)}</code></pre>
  </div><div>
  <pre><code>${hl(`// Arrays
const a = Array.from({ length: n }, () => []);
a.sort((x, y) => x - y);   // ALWAYS pass this
a.slice(i, j); a.at(-1);
const stack = []; stack.push(x); stack.pop();

// Strings
for (const c of str) {}
[...str].sort().join("");
str.toLowerCase(); /[a-z0-9]/i.test(c)
Math.floor((lo + hi) / 2); lo + hi >> 1`)}</code></pre>
  </div></div>
  <ul><li><code>[10, 9, 1].sort()</code> gives <code>[1, 10, 9]</code> because it sorts as strings. Always pass a compare function.</li>
  <li><code>queue.shift()</code> is O(n). For BFS use a head index or level arrays.</li>
  <li><code>??</code> treats only null and undefined as missing. <code>||</code> also treats 0 as missing, which breaks counts.</li></ul>`,
});

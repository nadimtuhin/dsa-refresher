// Start pages: plain reading, no tests. Template literals; ctx supplies counts and the highlighter.
export const startPages = ({ nCon, nPro, nDes, pass, hl }) => ({
  start: `<h1>Data structures, algorithms and system design, refreshed</h1>
  <p class="lead">${nCon} concepts, ${nPro} interview problems and ${nDes} system design topics. Every implementation and solution is plain JavaScript with a step-by-step animation, and all ${pass} tests pass before the site is built. One topic per page; tick it done at the bottom and your progress is saved in this browser.</p>
  <p><b>Part 1, Concepts:</b> how each structure works inside, what it costs, when to reach for it, and where it shows up in production. Read "How it works", then explain it out loud before opening the code.</p>
  <p><b>Part 2, Problems:</b> easy and easy-medium problems grouped by pattern. Read the prompt, say the clarifying questions, try it yourself first, then open the hint, the approach, and the solution in that order. Redo the ones you peeked at the next day, from a blank file.</p>
  <p><b>Part 3, System design:</b> the building blocks (caching, sharding, idempotency, outbox, retries) with tested code, then classic design prompts worked through the same 8 steps. Read the prompt, talk through your own answer, then compare.</p>
  <p class="lead">Use the arrow keys, or the Previous and Next links at the bottom of each page, to move through the book.</p>`,
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
  bigo: `<h2>Complexity classes</h2>
  <table>
    <tr><th>Big O</th><th>Name</th><th>Typical source</th><th>n = 1M feels like</th></tr>
    <tr><td>O(1)</td><td>constant</td><td>hash lookup, array index</td><td>instant</td></tr>
    <tr><td>O(log n)</td><td>logarithmic</td><td>binary search, heap op, B+tree</td><td>~20 steps</td></tr>
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

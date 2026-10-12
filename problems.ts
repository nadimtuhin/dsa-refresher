// Part 2: interview problems. Tested solutions + content.

export class ListNode { constructor(public val: number, public next: ListNode | null = null) {} }
export class TreeNode { constructor(public val: number, public left: TreeNode | null = null, public right: TreeNode | null = null) {} }

// test helpers
export const list = (a: number[]) => a.reduceRight<ListNode | null>((n, v) => new ListNode(v, n), null);
export const arr = (h: ListNode | null) => { const o: number[] = []; for (; h; h = h.next) o.push(h.val); return o; };
export function tree(a: (number | null)[]): TreeNode | null {
  if (!a.length || a[0] == null) return null;
  const root = new TreeNode(a[0]); const q = [root]; let i = 1, h = 0;
  while (i < a.length) {
    const n = q[h++];
    if (a[i] != null) { n.left = new TreeNode(a[i]!); q.push(n.left); } i++;
    if (i < a.length && a[i] != null) { n.right = new TreeNode(a[i]!); q.push(n.right); } i++;
  }
  return root;
}

// #region two-sum
export function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need)!, i];
    seen.set(nums[i], i);
  }
  return [];
}
// #endregion

// #region contains-duplicate
export function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
// #endregion

// #region valid-anagram
export function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
  const count = new Map<string, number>();
  for (const c of s) count.set(c, (count.get(c) ?? 0) + 1);
  for (const c of t) {
    const left = (count.get(c) ?? 0) - 1;
    if (left < 0) return false;
    count.set(c, left);
  }
  return true;
}
// #endregion

// #region group-anagrams
export function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const s of strs) {
    const key = [...s].sort().join(""); // "eat" -> "aet"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.values()];
}
// #endregion

// #region majority-element
export function majorityElement(nums: number[]): number {
  // Boyer-Moore vote: the majority survives every cancel-out
  let candidate = nums[0], votes = 0;
  for (const n of nums) {
    if (votes === 0) candidate = n;
    votes += n === candidate ? 1 : -1;
  }
  return candidate;
}
// #endregion

// #region top-k-frequent
export function topKFrequent(nums: number[], k: number): number[] {
  const count = new Map<number, number>();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);
  // bucket[i] = numbers that appear exactly i times
  const bucket: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [n, c] of count) bucket[c].push(n);
  const out: number[] = [];
  for (let c = bucket.length - 1; c > 0 && out.length < k; c--) out.push(...bucket[c]);
  return out.slice(0, k);
}
// #endregion

// #region valid-palindrome
export function isPalindrome(s: string): boolean {
  const ok = (c: string) => /[a-z0-9]/i.test(c);
  let l = 0, r = s.length - 1;
  while (l < r) {
    if (!ok(s[l])) { l++; continue; }
    if (!ok(s[r])) { r--; continue; }
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    l++; r--;
  }
  return true;
}
// #endregion

// #region merge-sorted-array
export function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  // fill from the back so we never overwrite unread values
  let i = m - 1, j = n - 1, w = m + n - 1;
  while (j >= 0) {
    if (i >= 0 && nums1[i] > nums2[j]) nums1[w--] = nums1[i--];
    else nums1[w--] = nums2[j--];
  }
}
// #endregion

// #region move-zeroes
export function moveZeroes(nums: number[]): void {
  let w = 0; // next slot for a non-zero
  for (let r = 0; r < nums.length; r++) {
    if (nums[r] !== 0) {
      [nums[w], nums[r]] = [nums[r], nums[w]];
      w++;
    }
  }
}
// #endregion

// #region remove-duplicates
export function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0;
  let w = 1;
  for (let r = 1; r < nums.length; r++) {
    if (nums[r] !== nums[w - 1]) nums[w++] = nums[r];
  }
  return w;
}
// #endregion

// #region best-time-stock
export function maxProfit(prices: number[]): number {
  let minSoFar = Infinity, best = 0;
  for (const p of prices) {
    minSoFar = Math.min(minSoFar, p);
    best = Math.max(best, p - minSoFar);
  }
  return best;
}
// #endregion

// #region longest-substring
export function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    const prev = lastSeen.get(s[i]);
    if (prev !== undefined && prev >= start) start = prev + 1; // jump past the repeat
    lastSeen.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}
// #endregion

// #region valid-parentheses
export function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const c of s) {
    if (c in pairs) {
      if (stack.pop() !== pairs[c]) return false;
    } else stack.push(c);
  }
  return stack.length === 0;
}
// #endregion

// #region min-stack
export class MinStack {
  private items: number[] = [];
  private mins: number[] = []; // mins[i] = min of items[0..i]
  push(x: number) {
    this.items.push(x);
    this.mins.push(this.mins.length ? Math.min(x, this.mins[this.mins.length - 1]) : x);
  }
  pop() { this.items.pop(); this.mins.pop(); }
  top() { return this.items[this.items.length - 1]; }
  getMin() { return this.mins[this.mins.length - 1]; }
}
// #endregion

// #region binary-search
export function search(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
// #endregion

// #region search-insert
export function searchInsert(nums: number[], target: number): number {
  // first index where nums[i] >= target ("lower bound")
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
// #endregion

// #region reverse-list
export function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  while (head) {
    const next = head.next; // save before we cut the link
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}
// #endregion

// #region merge-two-lists
export function mergeTwoLists(a: ListNode | null, b: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}
// #endregion

// #region linked-list-cycle
export function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
// #endregion

// #region max-depth
export function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
// #endregion

// #region invert-tree
export function invertTree(root: TreeNode | null): TreeNode | null {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}
// #endregion

// #region level-order
export function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const out: number[][] = [];
  let level = [root];
  while (level.length) {
    out.push(level.map(n => n.val));
    const next: TreeNode[] = [];
    for (const n of level) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    level = next;
  }
  return out;
}
// #endregion

// #region number-of-islands
export function numIslands(grid: string[][]): number {
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1") continue;
      islands++;
      const stack: [number, number][] = [[r, c]];
      grid[r][c] = "0"; // mark visited when pushed
      while (stack.length) {
        const [y, x] = stack.pop()!;
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && grid[ny][nx] === "1") {
            grid[ny][nx] = "0";
            stack.push([ny, nx]);
          }
        }
      }
    }
  }
  return islands;
}
// #endregion

// #region merge-intervals
export function mergeIntervals(intervals: number[][]): number[][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out: number[][] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); // overlap: extend
    else out.push([s, e]);
  }
  return out;
}
// #endregion

// #region climbing-stairs
export function climbStairs(n: number): number {
  // ways(n) = ways(n-1) + ways(n-2), keep only the last two
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
// #endregion

// #region max-subarray
export function maxSubArray(nums: number[]): number {
  // Kadane: either extend the current run or start fresh here
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}
// #endregion

// #region longest-common-prefix
export function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  for (let i = 0; i < strs[0].length; i++) {
    for (const s of strs) {
      if (i >= s.length || s[i] !== strs[0][i]) return strs[0].slice(0, i);
    }
  }
  return strs[0];
}
// #endregion

// ---------- tests: [actual, expected] ----------
const sortDeep = (g: string[][]) => g.map(x => [...x].sort()).sort((a, b) => a.join().localeCompare(b.join()));
export const tests: Record<string, () => [unknown, unknown][]> = {
  "two-sum": () => [[twoSum([2, 7, 11, 15], 9), [0, 1]], [twoSum([3, 2, 4], 6), [1, 2]], [twoSum([3, 3], 6), [0, 1]]],
  "contains-duplicate": () => [[containsDuplicate([1, 2, 3, 1]), true], [containsDuplicate([1, 2, 3]), false], [containsDuplicate([]), false]],
  "valid-anagram": () => [[isAnagram("anagram", "nagaram"), true], [isAnagram("rat", "car"), false], [isAnagram("a", "ab"), false]],
  "group-anagrams": () => [[sortDeep(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])), sortDeep([["bat"], ["nat", "tan"], ["ate", "eat", "tea"]])], [groupAnagrams([""]), [[""]]]],
  "majority-element": () => [[majorityElement([3, 2, 3]), 3], [majorityElement([2, 2, 1, 1, 1, 2, 2]), 2]],
  "top-k-frequent": () => [[topKFrequent([1, 1, 1, 2, 2, 3], 2).sort(), [1, 2]], [topKFrequent([1], 1), [1]]],
  "valid-palindrome": () => [[isPalindrome("A man, a plan, a canal: Panama"), true], [isPalindrome("race a car"), false], [isPalindrome(" "), true]],
  "merge-sorted-array": () => { const a = [1, 2, 3, 0, 0, 0]; merge(a, 3, [2, 5, 6], 3); const b = [0]; merge(b, 0, [1], 1); return [[a, [1, 2, 2, 3, 5, 6]], [b, [1]]]; },
  "move-zeroes": () => { const a = [0, 1, 0, 3, 12]; moveZeroes(a); return [[a, [1, 3, 12, 0, 0]]]; },
  "remove-duplicates": () => { const a = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]; const k = removeDuplicates(a); return [[k, 5], [a.slice(0, k), [0, 1, 2, 3, 4]], [removeDuplicates([]), 0]]; },
  "best-time-stock": () => [[maxProfit([7, 1, 5, 3, 6, 4]), 5], [maxProfit([7, 6, 4, 3, 1]), 0]],
  "longest-substring": () => [[lengthOfLongestSubstring("abcabcbb"), 3], [lengthOfLongestSubstring("bbbbb"), 1], [lengthOfLongestSubstring("pwwkew"), 3], [lengthOfLongestSubstring("abba"), 2], [lengthOfLongestSubstring(""), 0]],
  "valid-parentheses": () => [[isValid("()[]{}"), true], [isValid("(]"), false], [isValid("([)]"), false], [isValid("{[]}"), true], [isValid("("), false], [isValid(")"), false]],
  "min-stack": () => { const s = new MinStack(); s.push(-2); s.push(0); s.push(-3); const a = s.getMin(); s.pop(); return [[a, -3], [s.top(), 0], [s.getMin(), -2]]; },
  "binary-search": () => [[search([-1, 0, 3, 5, 9, 12], 9), 4], [search([-1, 0, 3, 5, 9, 12], 2), -1], [search([5], 5), 0]],
  "search-insert": () => [[searchInsert([1, 3, 5, 6], 5), 2], [searchInsert([1, 3, 5, 6], 2), 1], [searchInsert([1, 3, 5, 6], 7), 4], [searchInsert([1, 3, 5, 6], 0), 0]],
  "reverse-list": () => [[arr(reverseList(list([1, 2, 3, 4, 5]))), [5, 4, 3, 2, 1]], [arr(reverseList(null)), []]],
  "merge-two-lists": () => [[arr(mergeTwoLists(list([1, 2, 4]), list([1, 3, 4]))), [1, 1, 2, 3, 4, 4]], [arr(mergeTwoLists(null, list([0]))), [0]]],
  "linked-list-cycle": () => { const h = list([3, 2, 0, -4])!; let t = h; while (t.next) t = t.next; t.next = h.next; return [[hasCycle(h), true], [hasCycle(list([1, 2])), false], [hasCycle(null), false]]; },
  "max-depth": () => [[maxDepth(tree([3, 9, 20, null, null, 15, 7])), 3], [maxDepth(null), 0]],
  "invert-tree": () => [[levelOrder(invertTree(tree([4, 2, 7, 1, 3, 6, 9]))), [[4], [7, 2], [9, 6, 3, 1]]]],
  "level-order": () => [[levelOrder(tree([3, 9, 20, null, null, 15, 7])), [[3], [9, 20], [15, 7]]], [levelOrder(null), []]],
  "number-of-islands": () => [[numIslands([["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]]), 3], [numIslands([]), 0]],
  "merge-intervals": () => [[mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]]), [[1, 6], [8, 10], [15, 18]]], [mergeIntervals([[1, 4], [4, 5]]), [[1, 5]]], [mergeIntervals([[1, 4], [2, 3]]), [[1, 4]]]],
  "climbing-stairs": () => [[climbStairs(2), 2], [climbStairs(3), 3], [climbStairs(5), 8], [climbStairs(1), 1]],
  "max-subarray": () => [[maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6], [maxSubArray([-3, -1, -2]), -1]],
  "longest-common-prefix": () => [[longestCommonPrefix(["flower", "flow", "flight"]), "fl"], [longestCommonPrefix(["dog", "racecar", "car"]), ""], [longestCommonPrefix(["a"]), "a"]],
};

// ---------- book content ----------
export type Meta = {
  n: number; title: string; diff: "Easy" | "Medium"; prompt: string; examples: string[];
  clarify: string[]; hint: string; idea: string; time: string; space: string; traps: string[]; say: string;
};

export const chapters: { id: string; title: string; blurb: string; ids: string[] }[] = [
  { id: "hashing", title: "Arrays and hashing", blurb: "Need to remember what you've seen, or count things? Use a Map or Set. Turns O(n²) into O(n).", ids: ["two-sum", "contains-duplicate", "valid-anagram", "group-anagrams", "majority-element", "top-k-frequent"] },
  { id: "two-pointers", title: "Two pointers", blurb: "Sorted array, palindrome, or in-place rewrite? One pointer reads, one writes, or both walk in from the ends.", ids: ["valid-palindrome", "merge-sorted-array", "move-zeroes", "remove-duplicates"] },
  { id: "window", title: "Sliding window", blurb: "Best substring or subarray? Grow the right edge, shrink the left edge when the window breaks a rule.", ids: ["best-time-stock", "longest-substring"] },
  { id: "stack", title: "Stack", blurb: "Matching pairs, undo, the most recent thing first.", ids: ["valid-parentheses", "min-stack"] },
  { id: "binary-search", title: "Binary search", blurb: "Sorted input, or a yes/no answer that flips once? Halve the search space each step. O(log n).", ids: ["binary-search", "search-insert"] },
  { id: "linked-list", title: "Linked list", blurb: "Draw boxes and arrows. Save next before you cut a link. A dummy head removes edge cases.", ids: ["reverse-list", "merge-two-lists", "linked-list-cycle"] },
  { id: "trees", title: "Trees and BFS", blurb: "Recursion for depth-style questions. A queue, level by level, for breadth.", ids: ["max-depth", "invert-tree", "level-order"] },
  { id: "grid", title: "Grids and graphs", blurb: "Each cell is a node with 4 neighbours. Visit with DFS or BFS, mark visited.", ids: ["number-of-islands"] },
  { id: "intervals", title: "Intervals", blurb: "Sort by start, then walk and merge.", ids: ["merge-intervals"] },
  { id: "dp", title: "Simple DP", blurb: "The answer for n builds from smaller answers. Keep only what you need.", ids: ["climbing-stairs", "max-subarray"] },
  { id: "strings", title: "Strings", blurb: "Compare character by character, stop at the first mismatch.", ids: ["longest-common-prefix"] },
];

export const meta: Record<string, Meta> = {
  "two-sum": { n: 1, title: "Two Sum", diff: "Easy",
    prompt: "Given an array of numbers and a target, return the indexes of the two numbers that add up to the target. Exactly one answer exists. You can't use the same element twice.",
    examples: ["nums = [2,7,11,15], target = 9  ->  [0,1]", "nums = [3,3], target = 6  ->  [0,1]"],
    clarify: ["Can there be negative numbers?", "Always exactly one answer?", "Return indexes or values?"],
    hint: "For each number, the partner you need is target - num. Have you seen it already?",
    idea: "Walk once. Keep a Map of value to index for everything seen so far. For each number, check if target - num is in the map. Check before inserting, so a number never pairs with itself.",
    time: "O(n)", space: "O(n)",
    traps: ["Inserting before checking pairs a number with itself (fails [3,3] target 6 the other way round).", "The brute force double loop is O(n²). Mention it, then improve."],
    say: "Brute force is two loops, O(n squared). I can trade memory for time: store what I've seen in a map, then each lookup is O(1)." },
  "contains-duplicate": { n: 217, title: "Contains Duplicate", diff: "Easy",
    prompt: "Return true if any value appears at least twice in the array.",
    examples: ["[1,2,3,1] -> true", "[1,2,3,4] -> false"],
    clarify: ["Empty array returns false?", "Can I use extra memory?"],
    hint: "What data structure answers 'have I seen this?' in O(1)?",
    idea: "Put values in a Set while walking. If one is already there, return true.",
    time: "O(n)", space: "O(n)",
    traps: ["Sorting works too (O(n log n), O(1) extra). Mention the trade-off.", "One-liner: new Set(nums).size !== nums.length, but it can't stop early."],
    say: "A set gives O(1) membership checks, so one pass. If memory were tight I'd sort and compare neighbours instead." },
  "valid-anagram": { n: 242, title: "Valid Anagram", diff: "Easy",
    prompt: "Return true if t is a rearrangement of the letters of s.",
    examples: ["s = anagram, t = nagaram -> true", "s = rat, t = car -> false"],
    clarify: ["Only lowercase a to z, or any Unicode?", "Is case significant?"],
    hint: "Same letters, same counts.",
    idea: "If lengths differ, false. Count letters of s in a Map, then subtract for t. If any count goes below zero, false.",
    time: "O(n)", space: "O(k), k = distinct characters",
    traps: ["Forgetting the length check.", "For only a to z, a fixed array of 26 is faster than a Map."],
    say: "Anagrams have identical character counts. I'll count one string up and the other down." },
  "group-anagrams": { n: 49, title: "Group Anagrams", diff: "Medium",
    prompt: "Group the words that are anagrams of each other. Any order.",
    examples: ['["eat","tea","tan","ate","nat","bat"] -> [["bat"],["nat","tan"],["ate","eat","tea"]]'],
    clarify: ["Lowercase only?", "Does output order matter?"],
    hint: "Give every word a key that's the same for all its anagrams.",
    idea: "The key is the sorted letters (eat, tea, ate all become aet). Map from key to list of words.",
    time: "O(n · k log k), k = word length", space: "O(n · k)",
    traps: ["For a to z only, a count-based key (26 numbers joined) removes the sort: O(n · k)."],
    say: "This is grouping by a canonical key. Sorted letters is the simplest key." },
  "majority-element": { n: 169, title: "Majority Element", diff: "Easy",
    prompt: "Return the element that appears more than n/2 times. It always exists.",
    examples: ["[3,2,3] -> 3", "[2,2,1,1,1,2,2] -> 2"],
    clarify: ["Guaranteed to exist?"],
    hint: "Counting with a Map works. Can you do O(1) memory?",
    idea: "Boyer-Moore voting: keep a candidate and a vote count. Same value adds a vote, a different one removes a vote. At zero, take the current value as the new candidate. The majority can't be cancelled out.",
    time: "O(n)", space: "O(1)",
    traps: ["Only valid because a majority is guaranteed. Otherwise do a second pass to verify."],
    say: "A map count is the obvious answer. Since a majority is guaranteed, the voting trick gets memory to O(1)." },
  "top-k-frequent": { n: 347, title: "Top K Frequent Elements", diff: "Medium",
    prompt: "Return the k most frequent numbers.",
    examples: ["[1,1,1,2,2,3], k = 2 -> [1,2]"],
    clarify: ["Any order in the output?", "Ties?"],
    hint: "Count first. A count can't be bigger than n.",
    idea: "Count with a Map. Then bucket by count: bucket[c] holds numbers seen c times. Walk buckets from high to low until you have k.",
    time: "O(n)", space: "O(n)",
    traps: ["Sorting the counts is O(n log n). Fine to say first, then improve.", "A heap of size k gives O(n log k)."],
    say: "Count, then I need the top k. Sorting is n log n. Since counts are bounded by n, bucket sort makes it linear." },
  "valid-palindrome": { n: 125, title: "Valid Palindrome", diff: "Easy",
    prompt: "After lowercasing and removing non-alphanumeric characters, does the string read the same both ways?",
    examples: ['"A man, a plan, a canal: Panama" -> true', '"race a car" -> false'],
    clarify: ["Digits count as alphanumeric?", "Empty string is true?"],
    hint: "One pointer at each end, skip junk, compare, move inward.",
    idea: "Two pointers walk inward. Skip characters that aren't letters or digits. Compare lowercase. Any mismatch means false.",
    time: "O(n)", space: "O(1)",
    traps: ["Building a cleaned copy is fine but uses O(n) memory.", "Use l < r, not l <= r."],
    say: "I can clean and reverse, but two pointers do it in place with no extra string." },
  "merge-sorted-array": { n: 88, title: "Merge Sorted Array", diff: "Easy",
    prompt: "nums1 has m real values followed by n empty slots. Merge sorted nums2 (n values) into nums1, in place.",
    examples: ["nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6] -> [1,2,2,3,5,6]"],
    clarify: ["Both sorted ascending?", "In place, no return?"],
    hint: "The empty space is at the end. Which end should you fill from?",
    idea: "Three pointers from the back: last real value of nums1, last of nums2, last slot. Put the larger one in the slot. Stop when nums2 is used up.",
    time: "O(m + n)", space: "O(1)",
    traps: ["Filling from the front overwrites values you still need.", "Loop on j >= 0. Leftover nums1 values are already in place."],
    say: "Writing from the front would overwrite data, but the back has free space, so I merge from largest to smallest." },
  "move-zeroes": { n: 283, title: "Move Zeroes", diff: "Easy",
    prompt: "Move all zeros to the end in place, keeping the order of the other numbers.",
    examples: ["[0,1,0,3,12] -> [1,3,12,0,0]"],
    clarify: ["In place?", "Keep relative order?"],
    hint: "A reader pointer and a writer pointer.",
    idea: "w is where the next non-zero goes. Read every element. When it's non-zero, swap it into w and move w forward.",
    time: "O(n)", space: "O(1)",
    traps: ["Removing with splice inside a loop is O(n²) and skips elements."],
    say: "Classic read pointer, write pointer. Swapping keeps the zeros moving to the back." },
  "remove-duplicates": { n: 26, title: "Remove Duplicates from Sorted Array", diff: "Easy",
    prompt: "Sorted array. Remove duplicates in place so each value appears once. Return the new length k. The first k slots hold the answer.",
    examples: ["[0,0,1,1,1,2,2,3,3,4] -> 5, first five = [0,1,2,3,4]"],
    clarify: ["Sorted ascending?", "What's after k doesn't matter?"],
    hint: "Sorted means duplicates are neighbours.",
    idea: "Writer w starts at 1. For each value, if it differs from the last written value nums[w-1], write it at w.",
    time: "O(n)", space: "O(1)",
    traps: ["Compare with the last written value, not with nums[r-1]. Both work here, but the first generalises."],
    say: "Because it's sorted, I only need to compare with the last value I kept." },
  "best-time-stock": { n: 121, title: "Best Time to Buy and Sell Stock", diff: "Easy",
    prompt: "prices[i] is the price on day i. Buy once, sell once later. Return the max profit, or 0.",
    examples: ["[7,1,5,3,6,4] -> 5 (buy 1, sell 6)", "[7,6,4,3,1] -> 0"],
    clarify: ["Must buy before selling?", "Can profit be zero?"],
    hint: "For each day as the sell day, what's the best buy day before it?",
    idea: "Track the lowest price seen so far. Each day, profit if sold today = price - lowest. Keep the best.",
    time: "O(n)", space: "O(1)",
    traps: ["Taking global max minus global min ignores order (the min might come after the max)."],
    say: "For each sell day I just need the cheapest day before it, so I carry a running minimum." },
  "longest-substring": { n: 3, title: "Longest Substring Without Repeating Characters", diff: "Medium",
    prompt: "Return the length of the longest substring with no repeated character.",
    examples: ["abcabcbb -> 3 (abc)", "bbbbb -> 1", "pwwkew -> 3 (wke)"],
    clarify: ["Substring means contiguous?", "Character set?"],
    hint: "Keep a window with no repeats. When a repeat comes in, move the left edge past its last position.",
    idea: "Map each character to its last index. Window is start..i. If the current character was last seen inside the window, move start to just after it. Track the max window length.",
    time: "O(n)", space: "O(k)",
    traps: ["Only jump start forward if the old index is >= start ('abba' breaks otherwise).", "Substring is not subsequence."],
    say: "Sliding window. The right edge always grows, the left edge only moves forward, so each character is processed a constant number of times." },
  "valid-parentheses": { n: 20, title: "Valid Parentheses", diff: "Easy",
    prompt: "Is the bracket string balanced and correctly nested? Only ()[]{}.",
    examples: ["()[]{} -> true", "([)] -> false", "{[]} -> true"],
    clarify: ["Only these 6 characters?", "Empty string valid?"],
    hint: "The most recent open bracket must close first.",
    idea: "Push open brackets. On a closing bracket, pop and check it matches. At the end the stack must be empty.",
    time: "O(n)", space: "O(n)",
    traps: ["Forgetting the final empty check ('(' alone).", "A closing bracket on an empty stack: pop gives undefined, so it fails correctly."],
    say: "Last opened, first closed: that's a stack." },
  "min-stack": { n: 155, title: "Min Stack", diff: "Medium",
    prompt: "Design a stack with push, pop, top and getMin, all O(1).",
    examples: ["push -2, push 0, push -3, getMin -> -3, pop, top -> 0, getMin -> -2"],
    clarify: ["pop and top only called on a non-empty stack?"],
    hint: "Store the min at each height, not just one global min.",
    idea: "A second stack where mins[i] is the minimum of everything up to i. Push and pop both stacks together.",
    time: "O(1) each", space: "O(n)",
    traps: ["A single min variable breaks after popping the min."],
    say: "The trick is remembering the min at every level, so popping restores the old min for free." },
  "binary-search": { n: 704, title: "Binary Search", diff: "Easy",
    prompt: "Sorted array, return the index of target or -1.",
    examples: ["[-1,0,3,5,9,12], 9 -> 4", "[-1,0,3,5,9,12], 2 -> -1"],
    clarify: ["Sorted ascending? Duplicates?"],
    hint: "Compare with the middle, throw away half.",
    idea: "lo and hi bound the range. Check mid. Go right if mid is too small, left if too big. Stop when lo passes hi.",
    time: "O(log n)", space: "O(1)",
    traps: ["Use lo <= hi with hi = n - 1. Mixing styles gives infinite loops.", "mid = lo + (hi - lo) / 2 avoids overflow in other languages."],
    say: "Sorted input means binary search, log n. I'll use the inclusive version, lo <= hi." },
  "search-insert": { n: 35, title: "Search Insert Position", diff: "Easy",
    prompt: "Sorted array of distinct numbers. Return target's index, or where it would be inserted.",
    examples: ["[1,3,5,6], 5 -> 2", "[1,3,5,6], 2 -> 1", "[1,3,5,6], 7 -> 4"],
    clarify: ["Distinct values?"],
    hint: "You want the first index whose value is >= target.",
    idea: "Lower bound: hi = n (exclusive). If nums[mid] < target, answer is right of mid. Otherwise mid could be the answer, so hi = mid. Return lo.",
    time: "O(log n)", space: "O(1)",
    traps: ["This is the most reusable binary search shape. Learn this one."],
    say: "This is lower bound: the first position where the value is at least the target." },
  "reverse-list": { n: 206, title: "Reverse Linked List", diff: "Easy",
    prompt: "Reverse a singly linked list and return the new head.",
    examples: ["1->2->3->4->5 -> 5->4->3->2->1"],
    clarify: ["Iterative or recursive preferred?"],
    hint: "Three variables: prev, current, next.",
    idea: "Walk the list. Save next, point current back to prev, move prev and current forward. prev is the new head.",
    time: "O(n)", space: "O(1)",
    traps: ["Losing the rest of the list by not saving next first.", "Returning head instead of prev."],
    say: "I'll flip each arrow as I go. I save next before cutting the link." },
  "merge-two-lists": { n: 21, title: "Merge Two Sorted Lists", diff: "Easy",
    prompt: "Merge two sorted linked lists into one sorted list.",
    examples: ["1->2->4 + 1->3->4 -> 1->1->2->3->4->4"],
    clarify: ["Can I reuse the nodes?"],
    hint: "A dummy head means you never special-case the first node.",
    idea: "Dummy node plus tail. Attach the smaller head, advance it. When one list ends, attach the rest of the other.",
    time: "O(m + n)", space: "O(1)",
    traps: ["Forgetting to attach the leftover list."],
    say: "Dummy head so the first node isn't a special case, then a standard merge." },
  "linked-list-cycle": { n: 141, title: "Linked List Cycle", diff: "Easy",
    prompt: "Does the linked list loop back on itself?",
    examples: ["3->2->0->-4->(back to 2) -> true"],
    clarify: ["O(1) memory expected?"],
    hint: "A slow runner and a fast runner on a circular track meet.",
    idea: "slow moves 1, fast moves 2. If fast hits the end, no cycle. If they meet, there's a cycle.",
    time: "O(n)", space: "O(1)",
    traps: ["Check fast && fast.next before fast.next.next.", "A Set of visited nodes works too, with O(n) memory."],
    say: "A visited set is easy. Floyd's two pointers do it with O(1) memory." },
  "max-depth": { n: 104, title: "Maximum Depth of Binary Tree", diff: "Easy",
    prompt: "Return the number of nodes on the longest root-to-leaf path.",
    examples: ["[3,9,20,null,null,15,7] -> 3"],
    clarify: ["Empty tree is 0?"],
    hint: "Depth of a node = 1 + depth of its deeper child.",
    idea: "Recursion: null is 0, otherwise 1 + max of left and right.",
    time: "O(n)", space: "O(h), h = height",
    traps: ["Very deep trees can overflow the call stack. BFS level count avoids that."],
    say: "Recursive definition, each node visited once. Stack depth is the tree height." },
  "invert-tree": { n: 226, title: "Invert Binary Tree", diff: "Easy",
    prompt: "Mirror the tree: swap every node's left and right children.",
    examples: ["[4,2,7,1,3,6,9] -> [4,7,2,9,6,3,1]"],
    clarify: ["In place OK?"],
    hint: "Swap at the root, then do the same for each child.",
    idea: "Recursively invert both children and assign them swapped.",
    time: "O(n)", space: "O(h)",
    traps: ["Swapping then recursing into the 'wrong' side if you reuse old variables."],
    say: "Each node does the same small job, swap children, so recursion fits." },
  "level-order": { n: 102, title: "Binary Tree Level Order Traversal", diff: "Medium",
    prompt: "Return node values level by level, left to right.",
    examples: ["[3,9,20,null,null,15,7] -> [[3],[9,20],[15,7]]"],
    clarify: ["Empty tree returns []?"],
    hint: "BFS: process one whole level, collect the next level.",
    idea: "Start with [root]. Record its values. Build the next level from the children. Repeat until empty.",
    time: "O(n)", space: "O(w), w = widest level",
    traps: ["queue.shift() in JS is O(n). Use level arrays or a head index."],
    say: "Breadth-first. I process a full level at a time so grouping comes for free." },
  "number-of-islands": { n: 200, title: "Number of Islands", diff: "Medium",
    prompt: "Grid of '1' (land) and '0' (water). Count groups of land connected up, down, left, right.",
    examples: ["4x5 grid with three separate land groups -> 3"],
    clarify: ["Diagonals count?", "Can I modify the grid?"],
    hint: "Every time you find unvisited land, that's a new island. Then sink the whole island.",
    idea: "Scan every cell. On a '1', count an island and flood fill it with DFS (stack), turning connected land to '0' so it's never counted again.",
    time: "O(rows · cols)", space: "O(rows · cols) worst case",
    traps: ["Mark visited when you push, not when you pop, or cells get pushed many times.", "Bounds check before reading grid[ny][nx].", "If you can't modify the input, use a visited Set of 'r,c'."],
    say: "Each land cell is a node with up to 4 neighbours. Counting islands is counting connected components." },
  "merge-intervals": { n: 56, title: "Merge Intervals", diff: "Medium",
    prompt: "Merge all overlapping intervals.",
    examples: ["[[1,3],[2,6],[8,10],[15,18]] -> [[1,6],[8,10],[15,18]]", "[[1,4],[4,5]] -> [[1,5]]"],
    clarify: ["Do touching intervals like [1,4],[4,5] merge?", "Is the input sorted?"],
    hint: "After sorting by start, overlaps are neighbours.",
    idea: "Sort by start. For each interval, if it starts before the last merged one ends, extend the end. Otherwise start a new one.",
    time: "O(n log n)", space: "O(n)",
    traps: ["Default sort() compares as strings. Always pass (a, b) => a[0] - b[0].", "Use max for the end ([1,4],[2,3] stays [1,4])."],
    say: "Sorting by start puts overlapping intervals next to each other, then one pass merges them." },
  "climbing-stairs": { n: 70, title: "Climbing Stairs", diff: "Easy",
    prompt: "You climb 1 or 2 steps at a time. How many distinct ways to reach step n?",
    examples: ["n = 2 -> 2", "n = 3 -> 3", "n = 5 -> 8"],
    clarify: ["n >= 1?"],
    hint: "To reach step n, your last move came from n-1 or n-2.",
    idea: "ways(n) = ways(n-1) + ways(n-2). It's Fibonacci. Keep only the last two values.",
    time: "O(n)", space: "O(1)",
    traps: ["Plain recursion without memo is O(2^n)."],
    say: "The last step was either one or two, so the answer is the sum of the two before. Bottom up with two variables." },
  "max-subarray": { n: 53, title: "Maximum Subarray", diff: "Medium",
    prompt: "Return the largest sum of a contiguous, non-empty subarray.",
    examples: ["[-2,1,-3,4,-1,2,1,-5,4] -> 6 ([4,-1,2,1])", "[-3,-1,-2] -> -1"],
    clarify: ["All negatives possible?", "Non-empty?"],
    hint: "At each index: is it better to extend the previous run or start over here?",
    idea: "Kadane: cur = max(num, cur + num). best = max(best, cur).",
    time: "O(n)", space: "O(1)",
    traps: ["Starting best at 0 fails when every number is negative. Start at nums[0]."],
    say: "A negative running sum only hurts, so drop it and start fresh. One pass." },
  "longest-common-prefix": { n: 14, title: "Longest Common Prefix", diff: "Easy",
    prompt: "Return the longest prefix shared by all strings.",
    examples: ['["flower","flow","flight"] -> "fl"', '["dog","racecar","car"] -> ""'],
    clarify: ["Empty list returns empty string?"],
    hint: "Check column by column across all strings.",
    idea: "For each index of the first string, check every string has the same character there. Stop at the first mismatch or the shortest string's end.",
    time: "O(total characters)", space: "O(1)",
    traps: ["Running past a shorter string's end."],
    say: "Vertical scan, column by column, stop at the first mismatch." },
};

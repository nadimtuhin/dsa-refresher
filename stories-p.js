// Part 2 stories: what the problem is like in real life, and the trick told as a story.
// "Pointers" are explained as fingers on positions, since that's all they are.
export const storiesP = {
  "p-two-sum": {
    story: [
      "You have 9 taka and want to buy exactly two snacks that cost 9 together. Prices on the shelf: 2, 7, 11, 15. The slow way: try every pair. The smart way: walk the shelf once with a notebook. At 2 you think \"I'd need a 7\". Not seen yet, so write down \"2 is at spot 0\". At 7 you think \"I'd need a 2\". Check the notebook: yes, spot 0. Done.",
      "The notebook is a hash map. You trade a little memory for not checking every pair."
    ],
    examples: [
      "prices [2, 7, 11, 15], money 9: answer spots [0, 1].",
      "[3, 2, 4], target 6: at 2 you need 4 (not seen), at 4 you need 2 (seen at spot 1): [1, 2].",
      "[3, 3], target 6: check the notebook BEFORE writing the current number, or a 3 would match itself.",
      "Real life: matching a payment to an invoice amount, or finding two transactions that net to zero."
    ]
  },
  "p-contains-duplicate": {
    story: [
      "A party with a guest list at the door. As each guest arrives, the bouncer checks the list of who's already inside. If the name is already there, someone came twice.",
      "The list is a set: \"have I seen this before?\" in one step."
    ],
    examples: [
      "[1, 2, 3, 1]: the second 1 is already inside, so true.",
      "[1, 2, 3, 4]: everyone is new, so false.",
      "Real life: stopping the same email address from signing up twice.",
      "Other way: sort first, then duplicates sit next to each other. Slower but no extra memory."
    ]
  },
  "p-valid-anagram": {
    story: [
      "Two bags of Scrabble tiles. Are they the same letters? Tip the first bag out and count: 3 A, 1 N, 1 G, 1 R, 1 M. Then for each tile in the second bag, take one away from the count. If every count ends at zero, they match.",
      "Count with a map (letter to how many)."
    ],
    examples: [
      "\"anagram\" and \"nagaram\": same letters, true.",
      "\"rat\" and \"car\": the t has no partner, false.",
      "Different lengths: false straight away, no counting needed.",
      "Real life: spotting the same words in a different order, like \"listen\" and \"silent\"."
    ]
  },
  "p-group-anagrams": {
    story: [
      "Sorting mail into pigeonholes. For each word, sort its letters to get a label: \"eat\" becomes \"aet\", and so do \"tea\" and \"ate\". Put each word in the pigeonhole with its label.",
      "The map goes from label to the list of words."
    ],
    examples: [
      "[eat, tea, tan, ate, nat, bat] becomes [[eat, tea, ate], [tan, nat], [bat]].",
      "Label for \"tan\" and \"nat\" is \"ant\".",
      "Faster label for long words: count the 26 letters instead of sorting.",
      "Real life: grouping log lines that are the same message with words reordered."
    ]
  },
  "p-majority-element": {
    story: [
      "An election where one candidate got more than half the votes. Pair up voters from different sides and send each pair home. The majority candidate has so many voters that some will always be left standing.",
      "In code: keep one candidate and a count. Same vote, count up. Different vote, count down. At zero, the next voter's choice becomes the candidate. This is Boyer-Moore voting."
    ],
    examples: [
      "[3, 2, 3]: 3 has 2 of 3 votes, answer 3.",
      "[2, 2, 1, 1, 1, 2, 2]: counts go up and down, 2 is left standing.",
      "Easy way first: count every vote in a map. Then mention the no-memory trick.",
      "It only works because a majority is guaranteed. Otherwise you'd need a second pass to check."
    ]
  },
  "p-top-k-frequent": {
    story: [
      "A shop wants its 3 best sellers this month. First tally sales per product. Then, instead of sorting all products, make shelves numbered by how many were sold: shelf 1, shelf 2, ... shelf 100. Put each product on its shelf. Walk from the highest shelf down and grab 3.",
      "That's bucket sort: counts can't be bigger than the number of sales, so the shelves are limited."
    ],
    examples: [
      "[1, 1, 1, 2, 2, 3], k = 2: shelf 3 has 1, shelf 2 has 2, answer [1, 2].",
      "Sorting by count works too (n log n). Say it first, then improve.",
      "Heap way: keep the top k in a small heap of size k.",
      "Real life: trending hashtags, most searched words, most common errors in logs."
    ]
  },
  "p-valid-palindrome": {
    story: [
      "Two people read a sentence at the same time, one from the start and one from the end, walking toward each other. Both skip spaces and punctuation. At each step they compare letters. If they ever disagree, it's not a palindrome. If they meet, it is.",
      "Those two people are \"two pointers\": just two numbers saying which position each reader is at."
    ],
    examples: [
      "\"A man, a plan, a canal: Panama\": readers skip commas and spaces, every letter matches, true.",
      "\"race a car\": e and a disagree in the middle, false.",
      "Empty string or \" \": nothing to disagree, true.",
      "Real life: no-extra-memory checks on huge text."
    ]
  },
  "p-merge-sorted-array": {
    story: [
      "Two sorted lines of students must form one sorted line in the first line's space, which has empty spots at the back. Fill from the BACK: compare the tallest of each line, the taller walks to the last empty spot. Repeat.",
      "Filling from the front would bump into students who haven't moved yet. From the back, the spots are always empty."
    ],
    examples: [
      "nums1 [1, 2, 3, _, _, _], nums2 [2, 5, 6]: 6 goes last, then 5, then 3 vs 2... result [1, 2, 2, 3, 5, 6].",
      "Three fingers: last real value in nums1, last value in nums2, last empty slot.",
      "When nums2 runs out, you're done: nums1's leftovers are already in place.",
      "Real life: merging two sorted result pages into one."
    ]
  },
  "p-move-zeroes": {
    story: [
      "Packing a shelf of books with gaps. One hand (the reader) walks along the shelf. The other hand (the writer) marks the next spot to fill. Each time the reader finds a real book, it's swapped into the writer's spot and the writer moves one step. The gaps end up at the end.",
      "Reader and writer are just two positions, two pointers."
    ],
    examples: [
      "[0, 1, 0, 3, 12] becomes [1, 3, 12, 0, 0].",
      "The real books keep their order: 1 before 3 before 12.",
      "No second shelf needed: it's done in place.",
      "Same pattern: remove spam from an inbox list without copying it."
    ]
  },
  "p-remove-duplicates": {
    story: [
      "A sorted guest list with repeats: Ana, Ana, Bob, Cara, Cara. A writer copies each new name once. The reader walks the list; whenever the name differs from the last one written, the writer writes it down and moves on.",
      "Because the list is sorted, repeats always sit next to each other."
    ],
    examples: [
      "[1, 1, 2] becomes [1, 2, _], return 2.",
      "[0, 0, 1, 1, 1, 2, 2, 3, 3, 4] becomes [0, 1, 2, 3, 4, ...], return 5.",
      "Only the first k slots matter; what's after doesn't.",
      "Real life: cleaning a sorted export before saving it."
    ]
  },
  "p-best-time-stock": {
    story: [
      "You look back at a week of share prices. You want the best \"buy one day, sell a later day\". Walk day by day and remember the cheapest price so far. Each day ask: if I sold today, having bought at that cheapest day, what would I make? Keep the best answer.",
      "One walk, two things remembered: the cheapest so far and the best profit so far."
    ],
    examples: [
      "[7, 1, 5, 3, 6, 4]: buy at 1, sell at 6, profit 5.",
      "[7, 6, 4, 3, 1]: prices only fall, profit 0 (don't trade).",
      "You can't sell before you buy, which is why you only look at the cheapest price BEHIND today.",
      "Real life: largest rise in any metric over time, like server load from low to peak."
    ]
  },
  "p-longest-substring": {
    story: [
      "You're stringing beads and the rule is no repeated colours in a row. Keep a window: slide the right edge forward adding beads. When a repeat colour arrives, slide the left edge forward past the earlier bead of that colour. The longest window you ever held is the answer.",
      "This is the sliding window: two edges, both only ever move forward."
    ],
    examples: [
      "\"abcabcbb\": the window \"abc\" is the longest, 3.",
      "\"bbbbb\": every window is \"b\", 1.",
      "\"pwwkew\": \"wke\", 3. \"pwke\" doesn't count; it isn't contiguous.",
      "A map remembers the last spot of each colour, so the left edge can jump straight past it."
    ]
  },
  "p-valid-parentheses": {
    story: [
      "Stacking plates: you can only take the top plate. Every opening bracket is a plate you put down. Every closing bracket must match the top plate, which you then take off. At the end the table must be empty.",
      "That's a stack: last in, first out."
    ],
    examples: [
      "\"()[]{}\": each opens and closes right away, true.",
      "\"([)]\": ) arrives while [ is on top, false.",
      "\"((\": plates left on the table, false.",
      "Real life: code editors highlighting a missing bracket, HTML tags matching."
    ]
  },
  "p-min-stack": {
    story: [
      "A stack of plates where each plate also has a sticky note: \"the lightest plate from here down is X\". When you add a plate, the note is the smaller of its weight and the note below it. When you take one off, the note under it is still correct.",
      "So \"what's the lightest?\" is just reading the top note."
    ],
    examples: [
      "push 5 (min 5), push 3 (min 3), push 7 (min 3). getMin is 3.",
      "pop 7 and pop 3: the top note now says 5.",
      "Each plate stores two things: its value and the min at that point.",
      "Real life: undo history that also tracks the lowest balance so far."
    ]
  },
  "p-binary-search": {
    story: [
      "Finding page 731 in a 1,000 page book with no index. Open the middle: 500. Too low, so only the second half matters. Open the middle of that: 750. Too high. Each try halves what's left. About 10 tries.",
      "lo and hi are your two fingers marking the part of the book still possible."
    ],
    examples: [
      "[-1, 0, 3, 5, 9, 12], target 9: middle is 3, go right; middle is 9, found at index 4.",
      "Target 2: the fingers cross without finding it, return -1.",
      "Use lo <= hi so a one-item range is still checked.",
      "Real life: finding a version in a sorted release list."
    ]
  },
  "p-search-insert": {
    story: [
      "A sorted bookshelf. Where does a new book go? Binary search for its title. If it's there, that's the spot. If not, when your fingers cross, the left finger is exactly where it should slide in.",
      "Same as binary search, but the answer when not found is lo, not -1."
    ],
    examples: [
      "[1, 3, 5, 6], target 5: found at 2.",
      "Target 2: would go at index 1, between 1 and 3.",
      "Target 7: goes at the end, index 4.",
      "Target 0: goes at the start, index 0."
    ]
  },
  "p-reverse-list": {
    story: [
      "A line of people, each holding the shoulder of the person in front. You want them all facing the other way. Walk down the line and tell each person to let go and hold the person behind instead. Before they let go, note who was in front, or you'll lose the rest of the line.",
      "Three names to keep: previous, current, next."
    ],
    examples: [
      "1 → 2 → 3 becomes 3 → 2 → 1.",
      "At each step: save next, point current back at previous, move both forward.",
      "Empty list or one node: return it as is.",
      "Real life: undo stacks and browser history reverse a chain like this."
    ]
  },
  "p-merge-two-lists": {
    story: [
      "Two sorted lines of runners by number. You build one sorted line. Look at the front runner of each line; the smaller number steps into the new line. Repeat. When one line is empty, the rest of the other line just joins at the end.",
      "A dummy first runner makes the start simple: you always add after someone."
    ],
    examples: [
      "1 → 2 → 4 and 1 → 3 → 4 becomes 1 → 1 → 2 → 3 → 4 → 4.",
      "One list empty: the answer is the other list.",
      "No copying: you only re-link the runners you already have.",
      "Real life: merging two sorted feeds, like your posts and friends' posts by time."
    ]
  },
  "p-linked-list-cycle": {
    story: [
      "Two runners on a track you can't see the shape of. One runs twice as fast. If the track is a straight road, the fast one reaches the end. If the track is a loop, the fast one will eventually lap the slow one and they meet.",
      "That's Floyd's tortoise and hare: no notebook needed, just two runners."
    ],
    examples: [
      "3 → 2 → 0 → -4 → back to 2: the runners meet, true.",
      "1 → 2 → end: the fast runner reaches the end, false.",
      "Easy way: write each visited node in a set. Uses memory.",
      "Real life: detecting an infinite redirect loop, or a circular reference."
    ]
  },
  "p-max-depth": {
    story: [
      "A family tree. How many generations from the great-grandparent down to the youngest child on the longest branch? Ask each child: \"how deep is your side?\" Your answer is 1 (you) plus the deeper child's answer.",
      "Each person just asks their kids and adds one. That's recursion."
    ],
    examples: [
      "Root 3 with kids 9 and 20, and 20 has kids 15 and 7: depth 3.",
      "Empty tree: depth 0.",
      "One long chain of 1,000 nodes: depth 1,000, and deep recursion may overflow, so use a queue.",
      "Real life: deepest folder nesting on a disk."
    ]
  },
  "p-invert-tree": {
    story: [
      "Hold a family tree chart up to a mirror. Every left child becomes a right child, at every level. Each person swaps their two kids, then asks each kid to do the same.",
      "Small job per person, same job everywhere: recursion again."
    ],
    examples: [
      "4 with kids 2 and 7 becomes 4 with kids 7 and 2, and the same happens below.",
      "Leaf nodes: nothing to swap.",
      "Breadth first works too: take each node from a queue and swap its kids.",
      "Real life: flipping a layout for right-to-left languages."
    ]
  },
  "p-level-order": {
    story: [
      "A company org chart read out loud floor by floor: first the CEO, then everyone reporting to the CEO, then everyone reporting to them. Use a queue: take everyone currently in it (one floor), read them, and line up their reports for the next floor.",
      "The trick is counting how many are in the queue before you start each floor."
    ],
    examples: [
      "3, then 9 and 20, then 15 and 7: [[3], [9, 20], [15, 7]].",
      "Empty tree: [].",
      "Same idea: \"people within 2 connections of me\".",
      "Real life: showing comments level by level, or a site map by depth."
    ]
  },
  "p-number-of-islands": {
    story: [
      "A map with land and water squares. Walk over every square. When you step on land nobody has painted yet, that's a new island: count it, then paint the whole island by spreading to every touching land square (up, down, left, right).",
      "Painting means you never count the same island twice."
    ],
    examples: [
      "Two separate blobs of 1s: answer 2.",
      "Diagonal squares don't touch: two islands.",
      "Spreading can be depth first (recursion or stack) or breadth first (queue).",
      "Real life: counting separate regions in an image, or clusters on a map."
    ]
  },
  "p-merge-intervals": {
    story: [
      "Your calendar has overlapping meetings and you want the blocks of time you're busy. Sort the meetings by start time. Walk through: if the next one starts before the current block ends, stretch the block. Otherwise close the block and start a new one.",
      "Sorting first is what makes one walk enough."
    ],
    examples: [
      "[1,3], [2,6], [8,10], [15,18] becomes [1,6], [8,10], [15,18].",
      "[1,4], [4,5]: touching counts as overlap here, so [1,5].",
      "[1,10], [2,3]: the second is inside the first, end stays 10 (take the max).",
      "Real life: free/busy calendars, merging booked hotel nights."
    ]
  },
  "p-climbing-stairs": {
    story: [
      "To stand on stair 5, your last move was from stair 4 (one step) or stair 3 (two steps). So the ways to reach 5 are the ways to reach 4 plus the ways to reach 3. Start from the bottom: 1 way to stand on stair 1, 2 ways for stair 2, and keep adding.",
      "You only ever need the last two answers, so two numbers are enough."
    ],
    examples: [
      "n = 2: 1+1 or 2, 2 ways.",
      "n = 3: 3 ways. n = 4: 5 ways. n = 5: 8 ways. It's the Fibonacci numbers.",
      "Plain recursion recounts the same stairs again and again: very slow at n = 45.",
      "Real life: counting the ways to pay an amount with given coins."
    ]
  },
  "p-max-subarray": {
    story: [
      "A shopkeeper looks at daily profit and loss: +2, -3, +4, -1, +2, +1, -5. What's the best run of days in a row? Walk day by day with a running total. If the running total goes below zero, it only drags the future down, so drop it and start fresh today.",
      "That's Kadane's algorithm: keep the best run so far and the current run."
    ],
    examples: [
      "[-2, 1, -3, 4, -1, 2, 1, -5, 4]: best run is 4, -1, 2, 1, sum 6.",
      "All negative [-3, -1, -2]: answer -1; the run must have at least one day.",
      "[5, 4, -1, 7, 8]: take everything, 23.",
      "Real life: the best streak in sales, or the worst downtime window."
    ]
  },
  "p-longest-common-prefix": {
    story: [
      "Several file names in a folder: report-2024-jan, report-2024-feb, report-2023-dec. Read them together letter by letter. As soon as one word disagrees, or one word ends, stop. What you read so far is the shared start.",
      "Comparing the first letter of all, then the second of all, and so on."
    ],
    examples: [
      "[flower, flow, flight]: \"fl\".",
      "[dog, racecar, car]: \"\" (nothing shared).",
      "One word in the list: the whole word.",
      "Real life: finding the common folder of many file paths."
    ]
  }
};

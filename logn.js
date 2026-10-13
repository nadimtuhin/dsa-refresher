// "What log n means" page: small tested helpers used by its animations.
// #region halvings
// How many times can you halve n before 1 is left? That count is log2(n), rounded up.
function halvings(n) {
  let steps = 0;
  while (n > 1) {
    n = Math.ceil(n / 2);
    steps++;
  }
  return steps;
}

// Binary search over the numbers 1..n, counting the guesses. Never more than halvings(n) + 1.
function guessCount(n, secret) {
  let lo = 1, hi = n, guesses = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    guesses++;
    if (mid === secret) return guesses;
    if (mid < secret) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
// #endregion
export { halvings, guessCount };

export const tests = {
  halvings: () => [
    [[1, 2, 16, 17, 1000, 1e6, 1e9].map(halvings), [0, 1, 4, 5, 10, 20, 30]],
    [[halvings(1024), Math.log2(1024)], [10, 10]],
    [guessCount(16, 11), 4],
    [guessCount(1e6, 734512) <= halvings(1e6) + 1, true],
    [Math.max(...Array.from({ length: 1000 }, (_, i) => guessCount(1000, i + 1))), 10]
  ]
};

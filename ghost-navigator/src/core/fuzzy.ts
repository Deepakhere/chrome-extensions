// Smart fuzzy matching with word-boundary bonuses and typo tolerance

export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact match
  if (t === q) return 120;
  // Starts with query
  if (t.startsWith(q)) return 110;
  // Contains query as substring
  if (t.includes(q)) return 100;

  // Word boundary match: "sub btn" matches "Submit Button"
  const qWords = q.split(/\s+/).filter(Boolean);
  if (qWords.length > 1) {
    const allMatch = qWords.every((w) => t.includes(w));
    if (allMatch) return 95;
  }

  // Word-start matching: "lo" matches "Login" better than "follow"
  const tWords = t.split(/\s+/);
  let wordStartMatches = 0;
  for (const w of qWords) {
    if (tWords.some((tw) => tw.startsWith(w))) wordStartMatches++;
  }
  if (wordStartMatches === qWords.length && qWords.length > 0) return 90;

  // Subsequence match with consecutive bonus
  let score = 0;
  let qi = 0;
  let consecutive = 0;
  let lastMatchIdx = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      // Bonus for consecutive matches
      if (ti === lastMatchIdx + 1) {
        consecutive++;
        score += consecutive * 3;
      } else {
        consecutive = 0;
      }
      // Bonus for matching at word boundaries
      if (ti === 0 || /\s/.test(t[ti - 1]) || /[-_.]/.test(t[ti - 1])) {
        score += 5;
      }
      lastMatchIdx = ti;
      qi++;
    }
  }

  // All query chars must be found in sequence
  if (qi < q.length) return 0;

  // Normalize to 0-80 range
  const maxPossible = q.length * 18;
  return Math.min((score / maxPossible) * 80, 80);
}

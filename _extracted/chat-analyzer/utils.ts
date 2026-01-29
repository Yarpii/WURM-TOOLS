// ============================================================================
// CHAT ANALYZER - UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a consistent color for a player name based on hash
 */
export function getPlayerColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 65%)`;
}

/**
 * Calculate cosine similarity between two frequency maps
 */
export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...a.keys(), ...b.keys()]);

  for (const key of allKeys) {
    const valA = a.get(key) || 0;
    const valB = b.get(key) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate distribution similarity between two arrays
 */
export function distributionSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let sumDiff = 0;
  for (let i = 0; i < a.length; i++) {
    sumDiff += Math.abs(a[i] - b[i]);
  }

  return 1 - (sumDiff / 2); // Normalized
}

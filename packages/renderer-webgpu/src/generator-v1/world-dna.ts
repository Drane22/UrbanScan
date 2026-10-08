export interface WorldDNA {
  readonly accentVariant: number;
  readonly complexity: number;
  readonly density: number;
  readonly detailFrequency: number;
  readonly seed: number;
  readonly verticalBias: number;
}

/**
 * Deterministic PRNG using trigonometric fractional part with prime dispersion.
 * Completely deterministic across runs for identical seeds.
 */
export function seededRandom(seed: number, first: number, second = 0, salt = 0): number {
  const angle = first * 127.1 + second * 311.7 + salt * 43.7 + seed * 7_919;
  const value = Math.sin(angle) * 43_758.5;
  return value - Math.floor(value);
}

export function createBaseWorldDNA(seed: number): WorldDNA {
  return {
    accentVariant: seededRandom(seed, 11, 0, 101),
    complexity: 0.3 + seededRandom(seed, 14, 0, 404) * 0.7,
    density: 0.5 + seededRandom(seed, 12, 0, 202) * 0.5,
    detailFrequency: 0.2 + seededRandom(seed, 15, 0, 505) * 0.6,
    seed,
    verticalBias: 0.6 + seededRandom(seed, 13, 0, 303) * 0.5,
  };
}

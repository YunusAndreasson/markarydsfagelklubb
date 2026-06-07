/**
 * Rarity model for an observation — how rare the bird is, on a 0–5 scale where 0
 * is a common species and 5 is a true rarity. Drives the feed card's color-coded
 * rarity indicator (a left accent spine + a dot by the species name) via the
 * `RarityScale` heat ramp.
 *
 * NOTE: per-species rarity does not exist in the schema yet, so {@link rarityFor}
 * is a placeholder that reports the top of the scale for every observation. When
 * the `species.rarity` column lands it becomes a one-line change (see the TODO) —
 * every consumer already reads rarity through this module, so nothing else moves.
 */
import { RarityScale } from '@/constants/theme';
import { type FeedObservation } from '@/lib/query/observations';

export type RarityLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** The two schemes the ramp is keyed by — avoids importing the un-exported `ResolvedScheme`. */
type Scheme = keyof typeof RarityScale;

/**
 * The rarity level for an observation.
 *
 * PLACEHOLDER: there is no per-species rarity in the schema yet, so every
 * observation reports level 5 (the loudest state, so the indicator is visible).
 * TODO(rarity): once `species.rarity` exists and is selected into
 * `FeedObservation`, replace the body with the real value, e.g.
 *   return (observation.speciesRarity as RarityLevel) ?? 0;
 */
export function rarityFor(_observation: FeedObservation): RarityLevel {
  return 5;
}

/** Resolve a rarity level + active scheme to its heat color (used for the spine + dot). */
export function rarityColor(level: RarityLevel, scheme: Scheme): string {
  return RarityScale[scheme][level];
}

/**
 * Rarity model for an observation — how rare the bird is, on a 0–5 scale where
 * 0 is the rarest (a true rarity) and 5 is the most common species. Drives the
 * feed card's rarity badge (a color-coded chip showing the number) via the
 * `RarityScale` heat ramp.
 *
 * NOTE: per-species rarity does not exist in the schema yet, so {@link rarityFor}
 * is a placeholder that reports 5 (most common — the sensible default when
 * unknown) for every observation. When the `species.rarity` column lands it
 * becomes a one-line change (see the TODO) — every consumer already reads rarity
 * through this module, so nothing else moves.
 */
import { RarityScale } from '@/constants/theme';
import { type FeedObservation } from '@/lib/query/observations';

export type RarityLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** The two schemes the ramp is keyed by — avoids importing the un-exported `ResolvedScheme`. */
type Scheme = keyof typeof RarityScale;

/** The badge's chip colors for a rarity level: tinted background + legible number. */
export type RarityStyle = { background: string; foreground: string };

/**
 * The rarity level for an observation.
 *
 * PLACEHOLDER: there is no per-species rarity in the schema yet, so every
 * observation reports level 5 (most common — the safe default when unknown).
 * TODO(rarity): once `species.rarity` exists and is selected into
 * `FeedObservation`, replace the body with the real value, e.g.
 *   return (observation.speciesRarity as RarityLevel) ?? 5;
 */
export function rarityFor(_observation: FeedObservation): RarityLevel {
  return 5;
}

/** Resolve a rarity level + active scheme to its badge chip colors. */
export function rarityStyle(level: RarityLevel, scheme: Scheme): RarityStyle {
  return RarityScale[scheme][level];
}

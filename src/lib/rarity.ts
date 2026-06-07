/**
 * Rarity model for an observation — how rare the bird is, on a 0–5 scale where
 * 0 is the rarest (a true rarity) and 5 is the most common species. Drives the
 * feed card's rarity badge (a color-coded chip showing the number) via the
 * `RarityScale` heat ramp.
 *
 * Per-species rarity lives in `species.rarity` (the MaFk larmlista "prefix",
 * 0–5), selected into `FeedObservation.speciesRarity`. {@link rarityFor} reads
 * it, falling back to 5 (most common — the safe default) for the rare unlisted
 * species that carry no prefix.
 */
import { RarityScale } from '@/constants/theme';
import { type FeedObservation } from '@/lib/query/observations';

export type RarityLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** The two schemes the ramp is keyed by — avoids importing the un-exported `ResolvedScheme`. */
type Scheme = keyof typeof RarityScale;

/** The badge's chip colors for a rarity level: tinted background + legible number. */
export type RarityStyle = { background: string; foreground: string };

/**
 * The rarity level for an observation, from its species' larmlista prefix.
 * Unlisted species (no prefix) fall back to 5 (most common — the safe default).
 */
export function rarityFor(observation: FeedObservation): RarityLevel {
  return (observation.speciesRarity ?? 5) as RarityLevel;
}

/** Resolve a rarity level + active scheme to its badge chip colors. */
export function rarityStyle(level: RarityLevel, scheme: Scheme): RarityStyle {
  return RarityScale[scheme][level];
}

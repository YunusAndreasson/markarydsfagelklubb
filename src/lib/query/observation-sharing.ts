import { replaceEqualDeep } from '@tanstack/react-query';

import type { FeedObservation, MemberProfile } from './observations';

export type MemberFeed = {
  profile: MemberProfile | null;
  observations: FeedObservation[];
};

/** Query's default structural sharing only compares JSON values. Dates parsed
 * from an unchanged report are fresh objects on every fetch, so normalize those
 * two fields before comparing everything else (including new signed URLs). */
export function shareObservation(
  previous: FeedObservation | null | undefined,
  next: FeedObservation,
): FeedObservation {
  if (!previous || previous.id !== next.id || previous === next) return next;
  return replaceEqualDeep(previous, {
    ...next,
    observedAt: previous.observedAt.getTime() === next.observedAt.getTime()
      ? previous.observedAt : next.observedAt,
    createdAt: previous.createdAt.getTime() === next.createdAt.getTime()
      ? previous.createdAt : next.createdAt,
  });
}

/** Match by report id, rather than array position, so an insert or reorder does
 * not make every surviving card new. The fetched order and removals still win. */
export function shareObservationList(
  previous: FeedObservation[] | undefined,
  next: FeedObservation[],
): FeedObservation[] {
  if (!previous || previous === next) return next;
  const byId = new Map(previous.map((observation) => [observation.id, observation]));
  const shared = next.map((observation) => shareObservation(byId.get(observation.id), observation));
  if (previous.length === shared.length && shared.every((observation, i) => observation === previous[i])) {
    return previous;
  }
  return shared;
}

export function shareMemberFeed(previous: MemberFeed | undefined, next: MemberFeed): MemberFeed {
  if (!previous || previous === next) return next;
  const profile = replaceEqualDeep(previous.profile, next.profile);
  const observations = shareObservationList(previous.observations, next.observations);
  return profile === previous.profile && observations === previous.observations
    ? previous
    : { ...next, profile, observations };
}

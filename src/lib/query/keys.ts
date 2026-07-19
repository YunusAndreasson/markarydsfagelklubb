export const queryKeys = {
  // Profile data is private and user-specific. Including the auth id prevents a
  // persisted cache entry from a previous session being reused by a different
  // account while its own profile request is still in flight.
  profile: (userId: string) => ['profile', userId] as const,
  species: ['species'] as const,
  locations: ['locations'] as const,
  locationsCommon: ['locations', 'common'] as const,
  locationsActivity: ['locations', 'activity'] as const,
  feed: ['feed'] as const,
  observation: (id: string) => ['observation', id] as const,
  member: (userId: string) => ['member', userId] as const,
  alertsForLocation: (id: number) => ['alerts', 'location', id] as const,
}

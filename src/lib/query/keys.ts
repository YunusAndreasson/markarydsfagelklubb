export const queryKeys = {
  profile: ['profile'] as const,
  species: ['species'] as const,
  locations: ['locations'] as const,
  locationsCommon: ['locations', 'common'] as const,
  feed: ['feed'] as const,
  observation: (id: string) => ['observation', id] as const,
  member: (userId: string) => ['member', userId] as const,
}

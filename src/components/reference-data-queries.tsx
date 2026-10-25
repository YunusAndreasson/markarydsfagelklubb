import { useQuery } from '@tanstack/react-query';

import { locationsQueryOptions } from '@/lib/query/locations';
import { speciesQueryOptions } from '@/lib/query/species';

/** Mount once after auth and cache restoration. Refresh both registers in the
 * background without holding the splash; all pickers share these same queries. */
export function ReferenceDataQueries() {
  useQuery(speciesQueryOptions());
  useQuery(locationsQueryOptions());
  return null;
}

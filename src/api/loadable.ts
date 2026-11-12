import type { UseQueryResult } from '@tanstack/react-query'

/** What a screen needs from a query to show its data, its failure and a retry. */
export type Loadable<T> = Pick<UseQueryResult<T>, 'data' | 'error' | 'refetch'>

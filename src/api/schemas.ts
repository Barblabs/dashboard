import type { components } from './generated'

/** The backend's types, regenerated from its OpenAPI spec by `npm run gen:types`. */
export type Schemas = components['schemas']

/** A generated type with some fields narrowed where the spec is weaker than the backend. */
export type Override<T, U> = Omit<T, keyof U> & U

/*
 * The spec lets request bodies carry fields it does not list (`additionalProperties`), which
 * types them with an index signature. The dashboard only uses the listed fields, so it drops
 * the signature to keep `keyof` and excess-property checks meaningful.
 */
export type Known<T> = { [K in keyof T as string extends K ? never : K]: T[K] }

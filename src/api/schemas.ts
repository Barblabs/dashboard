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

type Missing<T, L extends readonly unknown[]> = Exclude<T, L[number]>

/*
 * A list of every member of the union `T`, in the order given: `tsc` fails on a member the
 * list leaves out, naming it, and on an entry that is not a member. A spec union the backend
 * grows or shrinks shows up here once generated.ts is regenerated.
 */
export function everyOf<T>() {
  return <const L extends readonly T[]>(
    list: L & ([Missing<T, L>] extends [never] ? unknown : { missing: Missing<T, L> }),
  ): L => list
}

/** Narrows a value read from outside, such as a URL or storage, to one of a list of codes. */
export function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
  return options.some((option) => option === value)
}

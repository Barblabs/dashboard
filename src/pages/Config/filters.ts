// Option values come from the fixed lists, so a lookup narrows them back without a cast.
export function pick<T extends string>(options: readonly T[], value: string): T | null {
  return options.find((option) => option === value) ?? null
}

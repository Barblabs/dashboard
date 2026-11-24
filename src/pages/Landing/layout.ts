export const WRAP = 'mx-auto w-full max-w-[1200px] px-5 md:px-10'

export const EYEBROW = 'font-mono text-[0.75rem] font-medium uppercase tracking-[0.14em]'

export const SECTION_IDS = ['flow', 'steps'] as const

export type SectionId = (typeof SECTION_IDS)[number]

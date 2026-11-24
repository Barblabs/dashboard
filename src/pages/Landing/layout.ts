export const WRAP = 'mx-auto w-full max-w-[1200px] px-5 md:px-10'

export const SECTION_IDS = ['steps', 'priorities', 'agents'] as const

export type SectionId = (typeof SECTION_IDS)[number]

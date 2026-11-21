/** A field label inside a Finding, as the inventory's details use. */
export const LABEL = 'font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase'

export const MONO = 'font-mono text-[0.8125rem]'

/** Text a Feed, the CMDB or an Agent wrote: shown as written, keeping its line breaks. No colour, so callers can vary it. */
export const WRITTEN = 'font-body text-[0.875rem] leading-[1.5] whitespace-pre-line'

/*
 * Written text in a Finding's detail, read as paragraphs: kept to a measure people can read
 * instead of the dialog's full width. No size, so the paragraph sets it.
 */
export const READING = 'max-w-[66ch] font-body leading-[1.6] whitespace-pre-line text-navy'

/** Secondary text beside a value: dates, sources, explanations. No colour, so callers can vary it. */
export const META = 'font-body text-[0.875rem]'

/** A section's heading in a Finding's detail, set apart from the field labels inside it. */
export const HEADING = 'font-title text-[1.125rem] leading-tight text-navy'

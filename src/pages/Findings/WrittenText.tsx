import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { READING } from './styles'

const MARK =
  'rounded-[3px] bg-cyan/18 px-0.5 text-navy shadow-[inset_0_-1.5px_0_var(--color-cyan)] [box-decoration-break:clone]'

function paragraphsOf(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/*
 * Matches whole values only, so the evidence "low" does not mark the "low" inside "follow".
 * Longest first, so "2024-08-19" wins over a shorter value it contains.
 */
function markPattern(marks: readonly string[]): RegExp | null {
  const terms = [...new Set(marks.filter((m) => m.length > 2))].toSorted((a, b) => b.length - a.length)
  if (terms.length === 0) return null
  return new RegExp(`(?<![\\p{L}\\p{N}])(${terms.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'u')
}

function Marked({ text, pattern }: { text: string; pattern: RegExp | null }) {
  if (!pattern) return text
  // split with a capture group puts every match at an odd index.
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className={MARK}>
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

interface Props {
  text: string
  /** Values the text's evidence cites, marked where the text names them. */
  marks?: readonly string[]
  /** Sets the first paragraph apart, for a reason whose first paragraph is the gist. */
  lead?: boolean
}

/**
 * Text a Feed, the CMDB or an Agent wrote, as its paragraphs at a readable measure. The words
 * are never changed: only the blank lines between them become paragraphs.
 */
export function WrittenText({ text, marks = [], lead = false }: Props) {
  const pattern = markPattern(marks)
  return (
    <div className="flex flex-col gap-3">
      {paragraphsOf(text).map((p, i) => (
        <p key={i} className={`${READING} ${lead && i === 0 ? 'text-[1rem] font-medium' : 'text-[0.9375rem]'}`}>
          <Marked text={p} pattern={pattern} />
        </p>
      ))}
    </div>
  )
}

/** Written text that shows its first paragraph and opens the rest on demand. */
export function ClampedText({ text }: { text: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const paragraphs = paragraphsOf(text)
  const rest = paragraphs.length - 1
  if (rest <= 0) return <WrittenText text={text} />

  return (
    <div className="flex flex-col gap-2">
      <WrittenText text={open ? text : paragraphs[0]} />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring cursor-pointer self-start rounded-sm font-body text-[0.8125rem] font-semibold text-nav-active-bg hover:underline"
      >
        {open ? t('findings.detail.showLess') : t('findings.detail.readMore', { count: rest })}
      </button>
    </div>
  )
}

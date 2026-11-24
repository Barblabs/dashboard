import { Popover } from '@base-ui/react/popover'
import { useTranslation } from 'react-i18next'
import { QuestionIcon } from './icons'

/*
 * A "?" beside a title that explains what the section under it shows. It is a Popover that also
 * opens on hover, not a Tooltip: Base UI's Tooltip never opens on touch and screen readers skip it,
 * and this text is how a reader learns to read a chart. A blank line in `text` starts a paragraph.
 */
export function InfoTip({ title, text }: { title: string; text: string }) {
  const { t } = useTranslation()

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        closeDelay={150}
        aria-label={t('common.infoTip', { title })}
        className="focus-ring inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray transition-colors duration-150 hover:text-navy data-popup-open:text-navy"
      >
        <QuestionIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-popover outline-none" side="bottom" align="start" sideOffset={6} collisionPadding={16}>
          <Popover.Popup className="flex w-max max-w-[min(24rem,var(--available-width))] origin-[var(--transform-origin)] flex-col gap-2 rounded-lg border border-border-panel bg-white p-4 font-body text-[0.8125rem] leading-relaxed text-navy shadow-lg outline-none transition-[scale,opacity] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <Popover.Title render={<p />} className="font-semibold">
              {title}
            </Popover.Title>
            <Popover.Description render={<div />} className="flex flex-col gap-2 text-gray">
              {text.split('\n\n').map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

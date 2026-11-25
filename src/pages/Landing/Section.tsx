import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP, type SectionId } from './layout'

export function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-16 border-t border-border-panel py-20 md:py-24">
      <div className={WRAP}>
        <h2
          id={`${id}-title`}
          className="max-w-[24ch] font-title text-balance text-[2rem] leading-[1.08] tracking-[-0.015em] text-navy md:text-[2.75rem]"
        >
          {t(`landing.${id}.title`)}
        </h2>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

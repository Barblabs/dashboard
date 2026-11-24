import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP, type SectionId } from './layout'

export function Section({ id, lead, children }: { id: SectionId; lead?: string; children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex min-h-svh scroll-mt-16 flex-col justify-center border-t border-border-panel pt-24 pb-16">
      <div className={WRAP}>
        <h2
          id={`${id}-title`}
          className="max-w-[24ch] font-title text-balance text-[2rem] leading-[1.08] tracking-[-0.015em] text-navy md:text-[2.75rem]"
        >
          {t(`landing.${id}.title`)}
        </h2>
        {lead && <p className="mt-4 max-w-[58ch] font-body text-[1.0625rem] leading-[1.6] text-gray">{lead}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

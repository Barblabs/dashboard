import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WRAP, type SectionId } from './layout'

export function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex min-h-svh scroll-mt-16 flex-col justify-center border-t border-border-panel py-24 md:py-28">
      <div className={WRAP}>
        <h2
          id={`${id}-title`}
          className="max-w-[24ch] font-title text-balance text-[2rem] leading-[1.08] tracking-[-0.015em] text-navy md:text-[2.75rem]"
        >
          {t(`landing.${id}.title`)}
        </h2>
        <p className="mt-4 max-w-[58ch] font-body text-[1.0625rem] leading-[1.6] text-gray">{t(`landing.${id}.lead`)}</p>
        <div className="mt-12 md:mt-14">{children}</div>
      </div>
    </section>
  )
}

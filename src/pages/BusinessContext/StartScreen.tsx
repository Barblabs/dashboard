import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { UploadFileIcon } from '../../components/ui/icons'

interface StartScreenProps {
  readOnly: boolean
  onImport: () => void
  onStart: () => void
}

/** Before anything is saved: an Admin imports documents or fills it in by hand; a Viewer reads that nothing is stated. */
export function StartScreen({ readOnly, onImport, onStart }: StartScreenProps) {
  const { t } = useTranslation()
  if (readOnly) {
    return (
      <p className="rounded-xl border border-border-panel bg-white px-6 py-10 text-center font-body text-[0.9375rem] text-gray">
        {t('businessContext.empty')}
      </p>
    )
  }
  return (
    <section
      aria-labelledby="bc-start-title"
      className="flex flex-col items-center gap-5 rounded-xl border border-border-panel bg-white px-6 py-14 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-cyan/15 text-nav-active-bg" aria-hidden="true">
        <UploadFileIcon />
      </span>
      <div className="flex max-w-[34rem] flex-col gap-2">
        <h2 id="bc-start-title" className="font-title text-[1.375rem] leading-tight text-navy">
          {t('businessContext.start.title')}
        </h2>
        <p className="font-body text-[0.9375rem] leading-[1.5] text-gray">{t('businessContext.start.description')}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={onImport}>
          {t('businessContext.start.import')}
        </Button>
        <button
          type="button"
          onClick={onStart}
          className="cursor-pointer rounded-md px-2 py-1 font-body text-[0.875rem] text-gray underline-offset-4 hover:text-navy hover:underline focus-ring"
        >
          {t('businessContext.start.manual')}
        </button>
      </div>
    </section>
  )
}

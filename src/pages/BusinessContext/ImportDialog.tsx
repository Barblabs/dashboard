import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DRAFT_FILE_EXTENSIONS,
  LIMITS,
  draftMediaTypeOf,
  useDraftBusinessContextMutation,
  type Draft,
} from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { requestErrorText } from '../../i18n/errors'

const ACCEPT = DRAFT_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',')

function sizeOf(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ImportDialog({
  open,
  onClose,
  onDraft,
}: {
  open: boolean
  onClose: () => void
  onDraft: (draft: Draft) => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const textId = useId()
  const fileId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const draft = useDraftBusinessContextMutation()
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const close = () => {
    if (draft.isPending) return
    draft.reset()
    setProblem(null)
    onClose()
  }

  function add(chosen: File[]) {
    setProblem(null)
    const next = [...files]
    for (const file of chosen) {
      if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file)
    }
    setFiles(next)
  }

  function check(): string | null {
    if (files.length === 0 && !text.trim()) return t('businessContext.import.required')
    if (files.length > LIMITS.documents) return t('businessContext.import.tooMany')
    for (const file of files) {
      if (!draftMediaTypeOf(file)) return t('businessContext.import.fileType', { name: file.name })
      if (file.size > LIMITS.documentBytes) return t('businessContext.import.fileTooLarge', { name: file.name })
    }
    if (files.reduce((sum, f) => sum + f.size, 0) > LIMITS.documentsBytes) return t('businessContext.import.tooLargeTogether')
    return null
  }

  function submit() {
    const failure = check()
    setProblem(failure)
    if (failure) return
    draft.mutate(
      { text, files },
      {
        onSuccess: (result) => {
          onDraft(result)
          setFiles([])
          setText('')
          draft.reset()
          onClose()
        },
      },
    )
  }

  const errorText =
    problem ?? (draft.isError ? requestErrorText(draft.error, t, { fallback: 'businessContext.import.failed' }) : null)

  return (
    <Modal open={open} onClose={close} labelledBy={titleId} width="lg">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
            {t('businessContext.import.title')}
          </h2>
          <p className="font-body text-[0.875rem] leading-[1.5] text-gray">{t('businessContext.import.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fileId} className="font-body text-[0.875rem] font-semibold text-navy">
            {t('businessContext.import.filesLabel')}
          </label>
          <input
            ref={fileInput}
            id={fileId}
            type="file"
            multiple
            accept={ACCEPT}
            disabled={draft.isPending}
            aria-describedby={`${fileId}-help`}
            onChange={(e) => {
              add([...(e.target.files ?? [])])
              e.target.value = ''
            }}
            className="sr-only"
          />
          <button
            type="button"
            disabled={draft.isPending}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              add([...e.dataTransfer.files])
            }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-muted-bg bg-panel px-4 py-6 font-body text-[0.875rem] text-gray transition-colors hover:border-navy hover:text-navy focus-ring disabled:cursor-not-allowed"
          >
            <span className="font-semibold text-navy">{t('businessContext.import.choose')}</span>
            <span id={`${fileId}-help`} className="text-[0.75rem]">
              {t('businessContext.import.fileHelp')}
            </span>
          </button>
          {files.length > 0 && (
            <ul className="flex flex-col divide-y divide-border-panel rounded-lg border border-border-panel">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate font-body text-[0.875rem] text-navy">{file.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[0.75rem] text-gray">{sizeOf(file.size)}</span>
                    <button
                      type="button"
                      disabled={draft.isPending}
                      aria-label={t('businessContext.import.removeFile', { name: file.name })}
                      onClick={() => setFiles(files.filter((f) => f !== file))}
                      className="flex size-6 cursor-pointer items-center justify-center rounded-md text-gray hover:bg-panel hover:text-critical focus-ring"
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={textId} className="font-body text-[0.875rem] font-semibold text-navy">
            {t('businessContext.import.textLabel')}
          </label>
          <textarea
            id={textId}
            rows={4}
            value={text}
            disabled={draft.isPending}
            placeholder={t('businessContext.import.textPlaceholder')}
            onChange={(e) => {
              setProblem(null)
              setText(e.target.value)
            }}
            className="w-full resize-y rounded-md border border-border-panel bg-white px-3 py-2.5 font-body text-[0.875rem] leading-[1.5] text-navy outline-none placeholder:text-gray focus:border-navy disabled:bg-panel"
          />
        </div>

        {draft.isPending && (
          <p role="status" className="flex items-center gap-2 font-body text-[0.875rem] text-nav-active-bg">
            <span className="size-2 animate-pulse rounded-full bg-cyan" aria-hidden="true" />
            {t('businessContext.import.wait')}
          </p>
        )}

        {errorText && (
          <p
            role="alert"
            className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical"
          >
            {errorText}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={draft.isPending} onClick={close}>
            {t('businessContext.import.cancel')}
          </Button>
          <Button size="sm" loading={draft.isPending} onClick={submit}>
            {draft.isPending ? t('businessContext.import.submitting') : t('businessContext.import.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

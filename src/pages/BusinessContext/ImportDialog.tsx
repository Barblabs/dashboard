import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Field as BaseField } from '@base-ui/react/field'
import {
  DRAFT_FILE_EXTENSIONS,
  LIMITS,
  draftMediaTypeOf,
  useDraftBusinessContextMutation,
  useIsDraftingBusinessContext,
  type Draft,
} from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { DialogLayout } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { CloseIcon } from '../../components/ui/icons'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { requestErrorText } from '../../i18n/errors'

const ACCEPT = DRAFT_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',')

function sizeOf(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onDraft: (draft: Draft) => void
}

export function ImportDialog({ open, onClose, onDraft }: ImportDialogProps) {
  // Closing unmounts the body, and with it the draft's onSuccess: wait for the agent to answer.
  const drafting = useIsDraftingBusinessContext()

  return (
    <Modal open={open} onClose={() => !drafting && onClose()} width="lg">
      <ImportBody onClose={onClose} onDraft={onDraft} />
    </Modal>
  )
}

function ImportBody({ onClose, onDraft }: Omit<ImportDialogProps, 'open'>) {
  const { t } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  const draft = useDraftBusinessContextMutation()
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  function edit() {
    setProblem(null)
    draft.reset()
  }

  function add(chosen: File[]) {
    edit()
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
          onClose()
        },
      },
    )
  }

  const errorText = problem ?? requestErrorText(draft.error, t, { fallback: 'businessContext.import.failed' })

  return (
    <DialogLayout
      title={t('businessContext.import.title')}
      description={t('businessContext.import.subtitle')}
      error={errorText}
      onSubmit={submit}
      actions={
        <>
          <Button variant="secondary" size="sm" disabled={draft.isPending} onClick={onClose}>
            {t('businessContext.import.cancel')}
          </Button>
          <Button type="submit" size="sm" loading={draft.isPending}>
            {draft.isPending ? t('businessContext.import.submitting') : t('businessContext.import.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <Field label={t('businessContext.import.filesLabel')}>
          <BaseField.Control
            render={
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                disabled={draft.isPending}
                onChange={(e) => {
                  add([...(e.target.files ?? [])])
                  e.target.value = ''
                }}
                className="sr-only"
              />
            }
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
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-muted-bg bg-panel px-4 py-6 font-body text-[0.875rem] text-gray transition-colors enabled:hover:border-navy enabled:hover:text-navy focus-ring disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="font-semibold text-navy">{t('businessContext.import.choose')}</span>
            <span className="text-[0.75rem]">{t('businessContext.import.fileHelp')}</span>
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
                      onClick={() => {
                        edit()
                        setFiles(files.filter((f) => f !== file))
                      }}
                      className="flex size-6 cursor-pointer items-center justify-center rounded-md text-gray enabled:hover:bg-panel enabled:hover:text-critical focus-ring disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <CloseIcon />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Field>
      </div>

      <Field label={t('businessContext.import.textLabel')}>
        <Textarea
          rows={4}
          value={text}
          disabled={draft.isPending}
          placeholder={t('businessContext.import.textPlaceholder')}
          onChange={(e) => {
            edit()
            setText(e.target.value)
          }}
        />
      </Field>

      {draft.isPending && (
        <p role="status" className="flex items-center gap-2 font-body text-[0.875rem] text-nav-active-bg">
          <span className="size-2 animate-pulse rounded-full bg-cyan" aria-hidden="true" />
          {t('businessContext.import.wait')}
        </p>
      )}
    </DialogLayout>
  )
}

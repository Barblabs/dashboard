import { useId } from 'react'
import type { CmdbSource } from '../../api/cmdb'
import { Modal } from '../../components/ui/Modal'
import { ItopForm } from './ItopForm'

interface Props {
  source: CmdbSource
  open: boolean
  onClose: () => void
}

// Editing a live connection is a short modal task: the connected view stays behind it, dimmed.
export function EditConnectionDialog({ source, open, onClose }: Props) {
  const titleId = useId()

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} width="md">
      <ItopForm
        mode="update"
        titleId={titleId}
        initialValues={{ url: source.url, user: source.user ?? '' }}
        onBack={onClose}
        onSaved={onClose}
      />
    </Modal>
  )
}

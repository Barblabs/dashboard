import { PlusIcon } from './icons'

// The page's one creating action, floating over the content: the icon needs the label to be named.
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="fixed right-8 bottom-8 z-50 flex size-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105 focus-ring"
    >
      <PlusIcon />
    </button>
  )
}

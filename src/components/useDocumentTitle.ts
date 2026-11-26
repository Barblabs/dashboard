import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} - Barbattack`
    return () => {
      document.title = 'Barbattack'
    }
  }, [title])
}

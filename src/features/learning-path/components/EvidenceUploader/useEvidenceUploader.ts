import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useSubmitEvidence } from '@/features/learning-path/hooks'

export function useEvidenceUploader(levelId: string, starId: string, itemId: string) {
  const mutation = useSubmitEvidence()

  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0]
      if (!file) return
      mutation.mutate({ levelId, starId, itemId, file })
    },
    [itemId, levelId, mutation, starId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  })

  return { getRootProps, getInputProps, isDragging: isDragActive, isUploading: mutation.isPending }
}

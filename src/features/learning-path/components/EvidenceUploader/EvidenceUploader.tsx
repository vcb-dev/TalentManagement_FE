import type { ReactNode } from 'react'

export interface EvidenceUploaderProps {
  isDragging: boolean
  getRootProps: () => Record<string, unknown>
  getInputProps: () => Record<string, unknown>
  children?: ReactNode
}

export function EvidenceUploader({ isDragging, getRootProps, getInputProps, children }: EvidenceUploaderProps) {
  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-md border border-dashed p-6 text-center text-sm ${
        isDragging ? 'border-primary bg-muted' : 'border-border'
      }`}
    >
      <input {...getInputProps()} />
      {children ?? 'Kéo thả tệp hoặc bấm để chọn'}
    </div>
  )
}

import { EvidenceUploader } from './EvidenceUploader'
import { useEvidenceUploader } from './useEvidenceUploader'

export function EvidenceUploaderContainer(props: {
  levelId: string
  starId: string
  itemId: string
}) {
  const uploader = useEvidenceUploader(props.levelId, props.starId, props.itemId)
  return (
    <EvidenceUploader
      isDragging={uploader.isDragging}
      getRootProps={uploader.getRootProps}
      getInputProps={uploader.getInputProps}
    />
  )
}

export { EvidenceUploader }

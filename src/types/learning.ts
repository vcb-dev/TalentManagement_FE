export interface ChecklistItem {
  id: string
  title: string
  order: number
}

export interface EvidencePayload {
  fileName: string
  mimeType: string
  sizeBytes: number
}

export interface LearningLevelSummary {
  id: string
  code: string
  title: string
  starCount: number
}

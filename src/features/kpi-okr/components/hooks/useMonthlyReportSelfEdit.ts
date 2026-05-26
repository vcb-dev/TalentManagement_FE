import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/axios'
import { performanceApi, type PerformanceAssignment } from '@/features/kpi-okr/api'

/**
 * Self-edit hook for Monthly Report — Epic 4.
 * Extracted from MonthlyReportScreen.tsx.
 *
 * Manages evidence, numeric value/unit, self-evaluation status, and self-review note.
 */
export function useMonthlyReportSelfEdit(item: PerformanceAssignment, onSaved: () => void) {
  const [evidence, setEvidence] = useState(item.evidence ?? '')
  const [numericRaw, setNumericRaw] = useState(
    item.numericValue != null ? String(item.numericValue) : ''
  )
  const [numericUnit, setNumericUnit] = useState(item.numericUnit ?? '')
  const [selfEvalStatus, setSelfEvalStatus] = useState(item.selfEvalStatus ?? '')
  const [selfReviewNote, setSelfReviewNote] = useState(item.selfReviewNote ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEvidence(item.evidence ?? '')
    setNumericRaw(item.numericValue != null ? String(item.numericValue) : '')
    setNumericUnit(item.numericUnit ?? '')
    setSelfEvalStatus(item.selfEvalStatus ?? '')
    setSelfReviewNote(item.selfReviewNote ?? '')
  }, [
    item.id,
    item.evidence,
    item.numericValue,
    item.numericUnit,
    item.selfEvalStatus,
    item.selfReviewNote,
  ])

  const save = async () => {
    const nTrim = numericRaw.trim()
    let numericValue: number | null = null
    if (nTrim.length > 0) {
      const n = Number(nTrim.replace(',', '.'))
      if (!Number.isFinite(n)) {
        toast.error('Số liệu không hợp lệ.')
        return
      }
      numericValue = n
    }
    if (item.status === 'done' && !evidence.trim()) {
      toast.warning('Trạng thái Hoàn thành nhưng minh chứng đang trống.')
    }
    setSaving(true)
    try {
      await performanceApi.patchAssignmentSelf(item.id, {
        evidence: evidence.trim() ? evidence.trim() : null,
        numericValue,
        numericUnit: numericUnit.trim() ? numericUnit.trim().toUpperCase() : null,
        selfEvalStatus: selfEvalStatus.trim() ? selfEvalStatus.trim() : null,
        selfReviewNote: selfReviewNote.trim() ? selfReviewNote.trim() : null,
      })
      toast.success('Đã lưu.')
      onSaved()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return {
    evidence,
    setEvidence,
    numericRaw,
    setNumericRaw,
    numericUnit,
    setNumericUnit,
    selfEvalStatus,
    setSelfEvalStatus,
    selfReviewNote,
    setSelfReviewNote,
    saving,
    save,
  }
}

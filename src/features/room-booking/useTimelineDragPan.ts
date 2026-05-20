import { useEffect, type RefObject } from 'react'

const DRAG_THRESHOLD_PX = 5

/** Nhấn giữ chuột trái và kéo để cuộn ngang vùng timeline. */
export function useTimelineDragPan(
  ref: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onDragRevealPast?: () => void
) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    let active = false
    let dragging = false
    let startX = 0
    let startScroll = 0

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      active = true
      dragging = false
      startX = e.pageX
      startScroll = el.scrollLeft
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!active) return
      const dx = e.pageX - startX
      if (!dragging && Math.abs(dx) < DRAG_THRESHOLD_PX) return
      dragging = true
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
      el.scrollLeft = startScroll - dx
    }

    const endDrag = () => {
      active = false
      dragging = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
    }

    el.style.cursor = 'grab'
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
      el.style.cursor = ''
      el.style.userSelect = ''
    }
  }, [ref, enabled, onDragRevealPast])
}

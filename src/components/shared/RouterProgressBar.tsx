import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

export function RouterProgressBar() {
  const status = useRouterState({ select: (s) => s.status })
  const [width, setWidth] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>()
  const completeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(fadeTimer.current)
    clearTimeout(completeTimer.current)

    if (status === 'pending') {
      setOpacity(1)
      setWidth(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setWidth(72))
      })
    } else {
      setWidth(100)
      completeTimer.current = setTimeout(() => {
        setOpacity(0)
        fadeTimer.current = setTimeout(() => setWidth(0), 300)
      }, 200)
    }

    return () => {
      clearTimeout(fadeTimer.current)
      clearTimeout(completeTimer.current)
    }
  }, [status])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${width}%`,
        height: '3px',
        opacity,
        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
        transition: `width ${width === 0 ? '0ms' : '500ms'} cubic-bezier(.4,0,.2,1), opacity 300ms ease`,
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 0 8px 1px rgba(99,102,241,0.5)',
      }}
    />
  )
}

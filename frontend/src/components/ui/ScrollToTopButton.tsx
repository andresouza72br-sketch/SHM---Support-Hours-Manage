import React, { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

interface ScrollToTopButtonProps {
  targetRef: React.RefObject<HTMLElement | null>
  threshold?: number
  className?: string
  title?: string
}

export function ScrollToTopButton({
  targetRef,
  threshold = 50,
  className = 'absolute top-3 left-1/2 -translate-x-1/2',
  title = 'Rolar para o início',
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    const handleScroll = () => {
      setVisible(el.scrollTop > threshold)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    // Verificação inicial após render
    handleScroll()

    return () => {
      el.removeEventListener('scroll', handleScroll)
    }
  }, [targetRef, threshold])

  if (!visible) return null

  const scrollToTop = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (targetRef.current) {
      targetRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      setVisible(false)
    }
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      title={title}
      aria-label={title}
      className={`z-30 flex items-center justify-center w-8 h-8 rounded-full bg-white/75 dark:bg-slate-800/75 backdrop-blur-md border border-slate-300/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 animate-in fade-in zoom-in-90 ${className}`}
    >
      <ChevronUp className="w-4 h-4 stroke-[2.5]" />
    </button>
  )
}

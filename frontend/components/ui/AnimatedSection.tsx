import React, { ReactNode } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  animation?: 'fadeIn' | 'slideUp' | 'slideInLeft' | 'slideInRight' | 'scaleIn'
  delay?: number
  threshold?: number
}

export function AnimatedSection({
  children,
  className = '',
  animation = 'slideUp',
  delay = 0,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold, triggerOnce: true })

  const animations = {
    fadeIn: {
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.6s ease-in-out',
    },
    slideUp: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
      transition: 'all 0.6s ease-out',
    },
    slideInLeft: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(-30px)',
      transition: 'all 0.6s ease-out',
    },
    slideInRight: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(30px)',
      transition: 'all 0.6s ease-out',
    },
    scaleIn: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.95)',
      transition: 'all 0.5s ease-out',
    },
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...animations[animation],
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

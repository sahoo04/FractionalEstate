import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'outlined' | 'glass' | 'glass-interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}, ref) => {
  const variants = {
    default: 'bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300',
    interactive: 'bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer',
    outlined: 'bg-white rounded-xl border-2 border-gray-200 transition-all duration-300',
    glass: 'glass-card rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:bg-white/85',
    'glass-interactive': 'glass-card rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] hover:bg-white/90 cursor-pointer active:scale-[0.98]'
  }
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        variants[variant],
        paddings[padding],
        'animate-fade-in',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'
export { Card }

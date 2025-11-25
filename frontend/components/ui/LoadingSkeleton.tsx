import React from 'react'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string
  height?: string
  lines?: number
}

export function LoadingSkeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]'
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  }

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...style,
              width: i === lines - 1 ? '80%' : '100%',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

// Common skeleton patterns
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
      <LoadingSkeleton variant="rectangular" height="200px" className="mb-4" />
      <LoadingSkeleton variant="text" className="mb-2" />
      <LoadingSkeleton variant="text" width="60%" className="mb-4" />
      <div className="flex gap-2">
        <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
        <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <LoadingSkeleton variant="text" width="120px" />
        <LoadingSkeleton variant="circular" width="48px" height="48px" />
      </div>
      <LoadingSkeleton variant="text" height="40px" className="mb-2" width="100px" />
      <LoadingSkeleton variant="text" width="80px" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <LoadingSkeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton variant="text" />
            <LoadingSkeleton variant="text" width="60%" />
          </div>
          <LoadingSkeleton variant="rectangular" width="100px" height="36px" />
        </div>
      ))}
    </div>
  )
}

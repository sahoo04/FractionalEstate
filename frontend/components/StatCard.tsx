import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
  alert?: boolean
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  change,
  changeType = 'neutral',
  subtitle,
  alert = false
}: StatCardProps) {
  return (
    <Card className={alert ? 'border-2 border-red-500' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            {icon}
            <span>{label}</span>
          </div>
          
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {value}
          </div>
          
          {(change || subtitle) && (
            <div className="flex items-center gap-2">
              {change && (
                <span className={cn(
                  'text-sm font-medium',
                  changeType === 'positive' && 'text-green-600',
                  changeType === 'negative' && 'text-red-600',
                  changeType === 'neutral' && 'text-gray-600'
                )}>
                  {changeType === 'positive' && '↑ '}
                  {changeType === 'negative' && '↓ '}
                  {change}
                </span>
              )}
              {subtitle && (
                <span className="text-sm text-gray-500">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        
        {alert && (
          <div className="ml-2">
            <span className="text-2xl">⚠️</span>
          </div>
        )}
      </div>
    </Card>
  )
}

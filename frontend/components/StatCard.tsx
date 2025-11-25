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
    <Card 
      variant="glass" 
      className={cn(
        'stat-box-glass transition-all duration-300',
        alert ? 'border-2 border-red-500 animate-pulse-slow' : '',
        'hover:scale-105'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2 transition-colors duration-300">
            <div className="transition-transform duration-300 group-hover:scale-110">
              {icon}
            </div>
            <span>{label}</span>
          </div>
          
          <div className="text-3xl font-bold text-gray-900 mb-1 transition-all duration-300 group-hover:text-primary-600">
            {value}
          </div>
          
          {(change || subtitle) && (
            <div className="flex items-center gap-2">
              {change && (
                <span className={cn(
                  'text-sm font-medium transition-colors duration-300',
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
                <span className="text-sm text-gray-500 transition-colors duration-300">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        
        {alert && (
          <div className="ml-2 animate-pulse-slow">
            <span className="text-2xl">⚠️</span>
          </div>
        )}
      </div>
    </Card>
  )
}

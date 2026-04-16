import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'orange' | 'green' | 'red' | 'purple'
  trend?: {
    value: number
    label: string
  }
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    icon: 'text-orange-400',
    border: 'border-orange-500/20',
  },
  green: {
    bg: 'bg-green-500/10',
    icon: 'text-green-400',
    border: 'border-green-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    icon: 'text-red-400',
    border: 'border-red-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    icon: 'text-purple-400',
    border: 'border-purple-500/20',
  },
}

export function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div className={cn(
      'bg-[#1E293B] rounded-xl p-5 border',
      colors.border
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-white text-2xl font-bold mt-1 truncate">{value}</p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded-full',
              trend.value >= 0
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl flex-shrink-0', colors.bg)}>
          <span className={colors.icon}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

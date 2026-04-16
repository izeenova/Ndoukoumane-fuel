'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'

interface MonthlyData {
  mois: string
  depenses: number
  litres: number
}

interface Props {
  monthlyData: MonthlyData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0F172A] border border-slate-700 rounded-xl p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-2 font-medium">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-300">
              {entry.dataKey === 'depenses'
                ? `${new Intl.NumberFormat('fr-FR').format(Math.round(entry.value))} FCFA`
                : `${new Intl.NumberFormat('fr-FR').format(Math.round(entry.value))} L`}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function DashboardCharts({ monthlyData }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Dépenses mensuelles */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Dépenses carburant (6 mois)</h3>
        {monthlyData.every(d => d.depenses === 0) ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="mois"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="depenses" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Dépenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Litres consommés */}
      <div className="bg-[#1E293B] rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Litres consommés (6 mois)</h3>
        {monthlyData.every(d => d.litres === 0) ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="mois"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="litres"
                stroke="#F97316"
                strokeWidth={2}
                dot={{ fill: '#F97316', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

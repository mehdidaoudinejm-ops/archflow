'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeekData {
  label: string
  users: number
}

export function WeeklySignupsChart({ data }: { data: WeekData[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={20}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={false}
          tickLine={false}
          width={24}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: 8,
            fontSize: 12,
            color: '#e4e4e7',
          }}
          cursor={{ fill: '#ffffff08' }}
          formatter={(value) => [value ?? 0, 'Inscriptions']}
        />
        <Bar dataKey="users" fill="#1A5C3A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function BudgetChart({ data }: { data: any[] }) {
  const safeData = data ?? [];
  if (safeData?.length === 0) return <div className="h-60 flex items-center justify-center text-sm text-gray-400">Không có dữ liệu</div>;

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={safeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }: any) => `${name ?? ''}: ${value ?? 0}%`}>
            {safeData?.map?.((entry: any, index: number) => (
              <Cell key={index} fill={entry?.color ?? '#818cf8'} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

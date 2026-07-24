'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function WeeklyChart({ data }: { data: any[] }) {
  const fmtNum = (v: number) => v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const safeData = (data ?? [])?.map?.((d: any) => ({
    ...(d ?? {}),
    'Doanh thu': d?.revenue ?? 0,
    'Chi phí': d?.spend ?? 0,
  })) ?? [];
  if (safeData?.length === 0) return <div className="h-60 flex items-center justify-center text-sm text-gray-400">Không có dữ liệu</div>;

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={safeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="week" tickLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => fmtNum(v) + 'đ'} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Doanh thu" fill="#818cf8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Chi phí" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function FunnelChart({ data }: { data: any[] }) {
  const safeData = data ?? [];
  if (safeData?.length === 0) return <div className="h-60 flex items-center justify-center text-sm text-gray-400">Không có dữ liệu</div>;

  const chartData = safeData?.map?.((d: any) => ({
    stage: d?.stage ?? '',
    'ROAS': (d?.spend ?? 0) > 0 ? Number(((d?.revenue ?? 0) / (d?.spend ?? 1))?.toFixed?.(1) ?? 0) : 0,
    'CTR %': (d?.impressions ?? 0) > 0 ? Number(((d?.clicks ?? 0) / (d?.impressions ?? 1) * 100)?.toFixed?.(1) ?? 0) : 0,
    'CVR %': (d?.clicks ?? 0) > 0 ? Number(((d?.conversions ?? 0) / (d?.clicks ?? 1) * 100)?.toFixed?.(1) ?? 0) : 0,
  })) ?? [];

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="stage" tickLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="ROAS" fill="#818cf8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="CTR %" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="CVR %" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function RevenueChart({ data }: { data: any[] }) {
  const safeData = data ?? [];
  if (safeData?.length === 0) return <div className="h-60 flex items-center justify-center text-sm text-gray-400">Không có dữ liệu</div>;

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 5, right: 10, left: 10, bottom: 25 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            tick={{ fontSize: 10 }}
            minTickGap={16}
            interval="preserveStartEnd"
            label={{ value: 'Ngày', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}Tr` : (v ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'rgba(255, 255, 255, 0.96)' }}
            formatter={(value: any, name: any) => [
              `${(Number(value) || 0).toLocaleString('vi-VN')} đ`,
              name === 'revenue' || name === 'Doanh thu' ? 'Doanh thu' : 'Chi phí quảng cáo'
            ]}
            labelFormatter={(label, payload) => {
              const fullDate = payload?.[0]?.payload?.fullDate;
              return fullDate ? `Ngày ${fullDate}` : `Ngày ${label}`;
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#818cf8" fill="url(#revGrad)" strokeWidth={2} name="Doanh thu" />
          <Area type="monotone" dataKey="adSpend" stroke="#f97316" fill="url(#spendGrad)" strokeWidth={2} name="Chi phí quảng cáo" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

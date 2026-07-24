export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [orders, content, abTests, kpi, calendar, customers, financeEntries, inboxKpis, automationLogs] = await Promise.all([
      prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.contentTracking.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.aBTest.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.kpiSnapshot.findFirst({ orderBy: { date: 'desc' } }),
      prisma.contentCalendar.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.customer.count(),
      prisma.financeEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.inboxKpi.count(),
      prisma.automationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    // Tính KPI từ dữ liệu thật trong DB
    const orderRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
    const totalOrders = kpi?.totalOrders ?? orders.length;
    const totalRevenue = kpi?.totalRevenue ?? orderRevenue;
    const adSpendEntries = financeEntries.filter(f => f.type === 'Chi' && f.category?.includes('Quảng cáo'));
    const totalAdSpend = kpi?.totalAdSpend ?? adSpendEntries.reduce((s, f) => s + (f.amount ?? 0), 0);
    const roas = kpi?.roas ?? (totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0);
    const conversionRate = kpi?.conversionRate ?? (totalOrders > 0 && inboxKpis > 0 ? Math.round((totalOrders / inboxKpis) * 100 * 10) / 10 : 0);

    // Revenue trend: tính từ dữ liệu finance thật (nếu có), nếu không thì trả mảng rỗng
    const revenueTrend: { date: string; revenue: number; adSpend: number }[] = [];
    if (financeEntries.length > 0 || orders.length > 0) {
      // Nhóm theo ngày từ FinanceEntry + Order
      const dateMap: Record<string, { revenue: number; adSpend: number }> = {};
      for (const o of orders) {
        const d = o.orderDate || o.createdAt.toISOString().slice(0, 10);
        if (!dateMap[d]) dateMap[d] = { revenue: 0, adSpend: 0 };
        dateMap[d].revenue += o.total ?? 0;
      }
      for (const f of financeEntries) {
        const d = f.date;
        if (!dateMap[d]) dateMap[d] = { revenue: 0, adSpend: 0 };
        if (f.type === 'Chi' && f.category?.includes('Quảng cáo')) {
          dateMap[d].adSpend += f.amount ?? 0;
        }
      }
      const sortedDates = Object.keys(dateMap).sort();
      for (const d of sortedDates.slice(-30)) {
        const parts = d.split('-');
        revenueTrend.push({
          date: `${parseInt(parts[2] || '0')}/${parseInt(parts[1] || '0')}`,
          revenue: dateMap[d].revenue,
          adSpend: dateMap[d].adSpend,
        });
      }
    }

    // Funnel data: tính từ ABTest thật
    const funnelData: { stage: string; impressions: number; clicks: number; conversions: number; spend: number; revenue: number }[] = [];
    if (abTests.length > 0) {
      const totalImp = abTests.reduce((s, t) => s + (t.impressionsA ?? 0) + (t.impressionsB ?? 0), 0);
      const totalClk = abTests.reduce((s, t) => s + (t.clicksA ?? 0) + (t.clicksB ?? 0), 0);
      const totalConv = abTests.reduce((s, t) => s + (t.conversionsA ?? 0) + (t.conversionsB ?? 0), 0);
      const totalSpend = abTests.reduce((s, t) => s + (t.budgetA ?? 0) + (t.budgetB ?? 0), 0);
      const totalRev = abTests.reduce((s, t) => s + (t.revenueA ?? 0) + (t.revenueB ?? 0), 0);
      // Phân bổ theo tỷ lệ ước lượng TOF/MOF/BOF
      funnelData.push(
        { stage: 'TOF', impressions: Math.round(totalImp * 0.52), clicks: Math.round(totalClk * 0.45), conversions: Math.round(totalConv * 0.35), spend: Math.round(totalSpend * 0.45), revenue: Math.round(totalRev * 0.34) },
        { stage: 'MOF', impressions: Math.round(totalImp * 0.30), clicks: Math.round(totalClk * 0.30), conversions: Math.round(totalConv * 0.35), spend: Math.round(totalSpend * 0.30), revenue: Math.round(totalRev * 0.39) },
        { stage: 'BOF', impressions: Math.round(totalImp * 0.18), clicks: Math.round(totalClk * 0.25), conversions: Math.round(totalConv * 0.30), spend: Math.round(totalSpend * 0.25), revenue: Math.round(totalRev * 0.27) },
      );
    }

    // Alerts: tạo từ dữ liệu thật (automation logs gần nhất)
    const alerts = automationLogs.slice(0, 5).map(log => ({
      type: log.level === 'error' ? 'error' : log.level === 'warning' ? 'warning' : log.level === 'info' ? 'info' : 'info',
      message: log.message,
      time: timeAgo(log.createdAt),
    }));

    // hasData = true nếu có bất kỳ dữ liệu thật nào trong DB
    const hasData = orders.length > 0 || abTests.length > 0 || financeEntries.length > 0 || (customers ?? 0) > 0 || (inboxKpis ?? 0) > 0 || content.length > 0;

    return NextResponse.json({
      hasData,
      kpis: { totalOrders, totalRevenue, totalAdSpend, roas: Number(roas?.toFixed?.(1) ?? 0), conversionRate },
      revenueTrend,
      funnelData,
      alerts,
      recentOrders: (orders ?? []).slice(0, 5),
      totalContent: content?.length ?? 0,
      calendarItems: (calendar ?? []).length ?? 0,
      totalCustomers: customers,
      totalInbox: inboxKpis,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} giờ trước`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} ngày trước`;
}

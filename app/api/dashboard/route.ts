export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days') || '30';
    
    let dateFrom: string | undefined;
    if (daysParam !== 'all') {
      const days = parseInt(daysParam, 10);
      if (!isNaN(days)) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        dateFrom = d.toISOString().slice(0, 10);
      }
    }

    const orderWhere = dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {};
    const financeWhere = dateFrom ? { date: { gte: dateFrom } } : {};
    const abTestWhere = dateFrom ? { dateStarted: { gte: dateFrom } } : {};

    const [orders, content, abTests, kpi, calendar, customers, financeEntries, inboxKpis, automationLogs] = await Promise.all([
      prisma.order.findMany({ where: orderWhere, orderBy: { createdAt: 'desc' } }),
      prisma.contentTracking.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.aBTest.findMany({ where: abTestWhere, orderBy: { createdAt: 'desc' } }),
      prisma.kpiSnapshot.findFirst({ orderBy: { date: 'desc' } }),
      prisma.contentCalendar.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.customer.count(),
      prisma.financeEntry.findMany({
        where: financeWhere,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inboxKpi.count(),
      prisma.automationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    // Tính KPI từ dữ liệu thật trong DB
    const orderRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
    const totalOrders = kpi?.totalOrders ?? orders.length;
    const totalRevenue = kpi?.totalRevenue ?? orderRevenue;
    const adSpendEntries = financeEntries.filter(f => f.type === 'Chi' && f.category?.includes('Quảng cáo'));
    const totalAdSpend = adSpendEntries.reduce((s, f) => s + (f.amount ?? 0), 0);
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    const conversionRate = kpi?.conversionRate ?? (totalOrders > 0 && inboxKpis > 0 ? Math.round((totalOrders / inboxKpis) * 100 * 10) / 10 : 0);

    // Tính KPI riêng cho Facebook (chỉ dùng category)
    const facebookOrders = orders.filter(o => o.source === 'Facebook' || o.source === 'Facebook Page');
    const fbOrderRevenue = facebookOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const fbAdSpendEntries = adSpendEntries.filter(f => f.category?.includes('Facebook'));
    const fbTotalAdSpend = fbAdSpendEntries.reduce((s, f) => s + (f.amount ?? 0), 0);
    const fbRoas = fbTotalAdSpend > 0 ? fbOrderRevenue / fbTotalAdSpend : 0;
    
    // Tính KPI riêng cho Instagram (chỉ dùng category)
    const instagramOrders = orders.filter(o => o.source === 'Instagram');
    const igOrderRevenue = instagramOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const igAdSpendEntries = adSpendEntries.filter(f => f.category?.includes('Instagram'));
    const igTotalAdSpend = igAdSpendEntries.reduce((s, f) => s + (f.amount ?? 0), 0);
    const igRoas = igTotalAdSpend > 0 ? igOrderRevenue / igTotalAdSpend : 0;

    const kpis = {
      totalOrders, 
      totalRevenue, 
      totalAdSpend, 
      roas: Number(roas?.toFixed?.(1) ?? 0), 
      conversionRate 
    };

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
      const sliceCount = daysParam === 'all' ? sortedDates.length : parseInt(daysParam, 10);
      for (const d of sortedDates.slice(-sliceCount)) {
        const parts = d.split('-');
        revenueTrend.push({
          date: `${parseInt(parts[2] || '0')}/${parseInt(parts[1] || '0')}`,
          fullDate: `${parseInt(parts[2] || '0')}/${parseInt(parts[1] || '0')}/${parts[0]}`,
          revenue: dateMap[d].revenue,
          adSpend: dateMap[d].adSpend,
        } as any);
      }
    }

    // Detailed records cho bảng: lấy từ revenueTrend nhưng giữ ngày đầy đủ để hiển thị, và tính roas
    const detailedRecords = (revenueTrend ?? []).map((r: any) => ({
      date: r.fullDate || r.date,
      revenue: r.revenue,
      adSpend: r.adSpend,
      roas: r.adSpend > 0 ? Number((r.revenue / r.adSpend).toFixed(2)) : 0
    })).reverse(); // Đảo ngược để hiện ngày mới nhất lên đầu

    // Campaign records: cộng dồn số liệu từ abTests theo từng chiến dịch
    const campaignsMap = new Map<string, any>();
    for (const test of abTests) {
      if (!test.testName) continue;
      const existing = campaignsMap.get(test.testName) || {
        name: test.testName,
        spend: 0,
        revenue: 0,
        clicks: 0,
        linkClicks: 0,
        landingPageViews: 0,
        impressions: 0,
        conversions: 0,
        roas: 0,
        ctr: 0, // CTR (tất cả)
        cpc: 0, // CPC (tất cả)
        ctrLink: 0, // CTR (click vào liên kết)
        cpcLink: 0, // CPC (click vào liên kết)
        cpm: 0,
        cpa: 0
      };
      
      existing.spend += test.budgetA ?? 0;
      existing.revenue += test.revenueA ?? 0;
      existing.clicks += test.clicksA ?? 0;
      existing.linkClicks += test.linkClicksA ?? 0;
      existing.landingPageViews += test.landingPageViewsA ?? 0;
      existing.impressions += test.impressionsA ?? 0;
      existing.conversions += test.conversionsA ?? 0;
      
      campaignsMap.set(test.testName, existing);
    }
    
    for (const camp of campaignsMap.values()) {
      camp.roas = camp.spend > 0 ? Number((camp.revenue / camp.spend).toFixed(2)) : 0;
      camp.ctr = camp.impressions > 0 ? Number(((camp.clicks / camp.impressions) * 100).toFixed(2)) : 0;
      camp.ctrLink = camp.impressions > 0 ? Number(((camp.linkClicks / camp.impressions) * 100).toFixed(2)) : 0;
      camp.cpa = camp.conversions > 0 ? Math.round(camp.spend / camp.conversions) : 0;
      camp.cpc = camp.clicks > 0 ? Math.round(camp.spend / camp.clicks) : 0;
      camp.cpcLink = camp.linkClicks > 0 ? Math.round(camp.spend / camp.linkClicks) : 0;
      camp.cpm = camp.impressions > 0 ? Math.round((camp.spend / camp.impressions) * 1000) : 0;
    }
    
    const campaignRecords = Array.from(campaignsMap.values());

    // Funnel data: tính từ ABTest thật dựa trên Tên chiến dịch
    const funnelStages = {
      TOF: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 },
      MOF: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 },
      BOF: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    };
    
    if (abTests.length > 0) {
      for (const test of abTests) {
        const name = (test.testName || '').toLowerCase();
        let stage: 'TOF' | 'MOF' | 'BOF' = 'MOF'; // Default
        
        if (name.includes('tof') || name.includes('reach') || name.includes('view') || name.includes('tuong tac') || name.includes('awareness')) {
          stage = 'TOF';
        } else if (name.includes('bof') || name.includes('retarget') || name.includes('remarket') || name.includes('chuyen doi') || name.includes('purchase')) {
          stage = 'BOF';
        } else if (name.includes('mof') || name.includes('mess') || name.includes('tin nhan') || name.includes('lead')) {
          stage = 'MOF';
        }
        
        funnelStages[stage].impressions += (test.impressionsA ?? 0) + (test.impressionsB ?? 0);
        funnelStages[stage].clicks += (test.clicksA ?? 0) + (test.clicksB ?? 0);
        funnelStages[stage].conversions += (test.conversionsA ?? 0) + (test.conversionsB ?? 0);
        funnelStages[stage].spend += (test.budgetA ?? 0) + (test.budgetB ?? 0);
        funnelStages[stage].revenue += (test.revenueA ?? 0) + (test.revenueB ?? 0);
      }
    }

    const funnelData = [
      { stage: 'TOF', ...funnelStages.TOF },
      { stage: 'MOF', ...funnelStages.MOF },
      { stage: 'BOF', ...funnelStages.BOF }
    ];

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
      kpis,
      revenueTrend,
      detailedRecords,
      campaignRecords,
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

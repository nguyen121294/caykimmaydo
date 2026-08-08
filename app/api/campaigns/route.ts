import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, format } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Mặc định lấy theo ngày, cho phép 0 = toàn thời gian (không lọc)
    let dateFilter = {};
    if (days > 0) {
      const cutoffDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      dateFilter = {
        dateStarted: {
          gte: cutoffDate,
        },
      };
    }

    const abTests = await prisma.aBTest.findMany({
      where: dateFilter,
      orderBy: {
        dateStarted: 'desc', // Sắp xếp từ ngày mới nhất
      },
    });

    const campaignsMap = new Map<string, any>();

    for (const test of abTests) {
      if (!test.testName) continue;

      const dailyRecord = {
        id: test.id,
        date: test.dateStarted,
        spend: test.budgetA ?? 0,
        revenue: test.revenueA ?? 0,
        clicks: test.clicksA ?? 0,
        linkClicks: test.linkClicksA ?? 0,
        landingPageViews: test.landingPageViewsA ?? 0,
        impressions: test.impressionsA ?? 0,
        conversions: test.conversionsA ?? 0,
      };

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
        ctr: 0,
        cpc: 0,
        ctrLink: 0,
        cpcLink: 0,
        cpm: 0,
        cpa: 0,
        dailyRecords: []
      };

      // Cộng dồn
      existing.spend += dailyRecord.spend;
      existing.revenue += dailyRecord.revenue;
      existing.clicks += dailyRecord.clicks;
      existing.linkClicks += dailyRecord.linkClicks;
      existing.landingPageViews += dailyRecord.landingPageViews;
      existing.impressions += dailyRecord.impressions;
      existing.conversions += dailyRecord.conversions;

      // Thêm bản ghi hàng ngày vào mảng (đã được sort desc nhờ query)
      existing.dailyRecords.push(dailyRecord);

      campaignsMap.set(test.testName, existing);
    }

    // Tính toán tỷ lệ phần trăm và giá trị trung bình cho cấp độ Chiến dịch
    for (const camp of campaignsMap.values()) {
      camp.roas = camp.spend > 0 ? Number((camp.revenue / camp.spend).toFixed(2)) : 0;
      camp.ctr = camp.impressions > 0 ? Number(((camp.clicks / camp.impressions) * 100).toFixed(2)) : 0;
      camp.ctrLink = camp.impressions > 0 ? Number(((camp.linkClicks / camp.impressions) * 100).toFixed(2)) : 0;
      camp.cpa = camp.conversions > 0 ? Math.round(camp.spend / camp.conversions) : 0;
      camp.cpc = camp.clicks > 0 ? Math.round(camp.spend / camp.clicks) : 0;
      camp.cpcLink = camp.linkClicks > 0 ? Math.round(camp.spend / camp.linkClicks) : 0;
      camp.cpm = camp.impressions > 0 ? Math.round((camp.spend / camp.impressions) * 1000) : 0;

      // Tính luôn các chỉ số tỷ lệ cho từng ngày bên trong
      camp.dailyRecords = camp.dailyRecords.map((dr: any) => ({
        ...dr,
        roas: dr.spend > 0 ? Number((dr.revenue / dr.spend).toFixed(2)) : 0,
        ctr: dr.impressions > 0 ? Number(((dr.clicks / dr.impressions) * 100).toFixed(2)) : 0,
        ctrLink: dr.impressions > 0 ? Number(((dr.linkClicks / dr.impressions) * 100).toFixed(2)) : 0,
        cpa: dr.conversions > 0 ? Math.round(dr.spend / dr.conversions) : 0,
        cpc: dr.clicks > 0 ? Math.round(dr.spend / dr.clicks) : 0,
        cpcLink: dr.linkClicks > 0 ? Math.round(dr.spend / dr.linkClicks) : 0,
        cpm: dr.impressions > 0 ? Math.round((dr.spend / dr.impressions) * 1000) : 0,
      }));
    }

    const campaignRecords = Array.from(campaignsMap.values());
    // Sắp xếp chiến dịch theo số tiền tiêu giảm dần
    campaignRecords.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ campaignRecords });
  } catch (error) {
    console.error('Lỗi API campaigns:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignName = decodeURIComponent(params.id);

    // Lấy tất cả ABTest records thuộc campaign này, sắp xếp theo ngày mới nhất
    const records = await prisma.aBTest.findMany({
      where: {
        testName: campaignName,
      },
      orderBy: {
        dateStarted: 'desc',
      },
    });

    const dailyData = records.map(test => {
      const spend = test.budgetA ?? 0;
      const revenue = test.revenueA ?? 0;
      const clicks = test.clicksA ?? 0;
      const linkClicks = test.linkClicksA ?? 0;
      const landingPageViews = test.landingPageViewsA ?? 0;
      const impressions = test.impressionsA ?? 0;
      const conversions = test.conversionsA ?? 0;

      return {
        id: test.id,
        date: test.dateStarted,
        spend,
        revenue,
        clicks,
        linkClicks,
        landingPageViews,
        impressions,
        conversions,
        roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        ctrLink: impressions > 0 ? Number(((linkClicks / impressions) * 100).toFixed(2)) : 0,
        cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
        cpc: clicks > 0 ? Math.round(spend / clicks) : 0,
        cpcLink: linkClicks > 0 ? Math.round(spend / linkClicks) : 0,
        cpm: impressions > 0 ? Math.round((spend / impressions) * 1000) : 0,
      };
    });

    return NextResponse.json(dailyData);
  } catch (error) {
    console.error('Lỗi khi tải chi tiết chiến dịch:', error);
    return NextResponse.json({ error: 'Không thể tải chi tiết chiến dịch' }, { status: 500 });
  }
}

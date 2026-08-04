export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

async function getTokenForPlatform(platform: string): Promise<{ token: string | null; pageId?: string; adAccountId?: string; igAccountId?: string }> {
  const credential = await prisma.platformCredential.findUnique({ where: { platform } });
  if (!credential || !credential.isConnected) return { token: null };
  try {
    const decrypted = decrypt(credential.credentials);
    const parsed = JSON.parse(decrypted);
    if (parsed?.type !== 'live' || (!parsed?.token && !parsed?.userToken)) return { token: null };
    return {
      token: parsed.token || parsed.userToken,
      pageId: parsed.pageId,
      adAccountId: parsed.adAccountId,
      igAccountId: parsed.igAccountId
    };
  } catch {
    return { token: null };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default fallback data matching the screenshot structure
    let profileActivity = {
      profileVisits: 35,
      newFollowers: 3,
    };

    let goalMetrics = {
      profileVisitsGoal: 0,
      firstPlays: 467,
      costPerPurchase: null as string | null,
    };

    let adDetails = {
      status: 'Còn 3 ngày',
      spend: 46675,
      totalBudget: 160000,
      duration: '4 ngày',
      targetAudience: 'Tiềm năng 2 (Thoa)',
    };

    let topLocations = [
      { name: 'Ho Chi Minh City', percentage: 59.5 },
      { name: 'Hanoi', percentage: 28.2 },
      { name: 'Da Nang', percentage: 7.3 },
      { name: 'Can Tho', percentage: 5.0 },
    ];

    let genderBreakdown = [
      { name: 'Nữ', percentage: 68.4 },
      { name: 'Nam', percentage: 31.6 },
    ];

    let ageBreakdown = [
      { range: '18 - 24', percentage: 15.2 },
      { range: '25 - 34', percentage: 52.8 },
      { range: '35 - 44', percentage: 22.0 },
      { range: '45+', percentage: 10.0 },
    ];

    let isLive = false;

    // Try fetching from Facebook Ads API
    const { token: adsToken, adAccountId } = await getTokenForPlatform('Facebook Ads');
    const { token: igToken, igAccountId } = await getTokenForPlatform('Instagram');
    const effectiveToken = adsToken || igToken;

    if (effectiveToken) {
      try {
        let actId = adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : '';
        if (!actId) {
          const actRes = await fetch(
            `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${encodeURIComponent(effectiveToken)}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (actRes.ok) {
            const actData = await actRes.json();
            if (actData?.data?.[0]?.id) actId = actData.data[0].id;
          }
        }

        if (actId) {
          // Fetch Region Breakdown (Vị trí)
          const regionRes = await fetch(
            `https://graph.facebook.com/v19.0/${actId}/insights?fields=impressions,reach,spend&breakdowns=region&date_preset=last_30d&limit=10&access_token=${encodeURIComponent(effectiveToken)}`,
            { signal: AbortSignal.timeout(10000) }
          );

          if (regionRes.ok) {
            const regionData = await regionRes.json();
            const rows = regionData?.data || [];
            const totalImp = rows.reduce((acc: number, r: any) => acc + (parseInt(r.impressions || '0', 10)), 0);
            if (totalImp > 0) {
              topLocations = rows.slice(0, 5).map((r: any) => {
                const imp = parseInt(r.impressions || '0', 10);
                return {
                  name: r.region || 'Khác',
                  percentage: parseFloat(((imp / totalImp) * 100).toFixed(1)),
                };
              });
              isLive = true;
            }
          }

          // Fetch Gender & Age Breakdown
          const demoRes = await fetch(
            `https://graph.facebook.com/v19.0/${actId}/insights?fields=impressions,reach&breakdowns=gender,age&date_preset=last_30d&limit=20&access_token=${encodeURIComponent(effectiveToken)}`,
            { signal: AbortSignal.timeout(10000) }
          );

          if (demoRes.ok) {
            const demoData = await demoRes.json();
            const rows = demoData?.data || [];
            const totalImp = rows.reduce((acc: number, r: any) => acc + (parseInt(r.impressions || '0', 10)), 0);
            if (totalImp > 0) {
              // Aggregate Gender
              const femaleImp = rows.filter((r: any) => r.gender === 'female').reduce((acc: number, r: any) => acc + parseInt(r.impressions || '0', 10), 0);
              const maleImp = rows.filter((r: any) => r.gender === 'male').reduce((acc: number, r: any) => acc + parseInt(r.impressions || '0', 10), 0);
              if (femaleImp + maleImp > 0) {
                const totalGender = femaleImp + maleImp;
                genderBreakdown = [
                  { name: 'Nữ', percentage: parseFloat(((femaleImp / totalGender) * 100).toFixed(1)) },
                  { name: 'Nam', percentage: parseFloat(((maleImp / totalGender) * 100).toFixed(1)) },
                ];
              }

              // Aggregate Age
              const ageMap: Record<string, number> = {};
              for (const r of rows) {
                const ageGroup = r.age || 'Khác';
                ageMap[ageGroup] = (ageMap[ageGroup] || 0) + parseInt(r.impressions || '0', 10);
              }
              ageBreakdown = Object.entries(ageMap).map(([range, imp]) => ({
                range,
                percentage: parseFloat(((imp / totalImp) * 100).toFixed(1)),
              })).sort((a, b) => b.percentage - a.percentage);
            }
          }
        }
      } catch (err) {
        console.error('Meta Demographics API fetch error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      isLive,
      profileActivity,
      goalMetrics,
      adDetails,
      topLocations,
      genderBreakdown,
      ageBreakdown,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

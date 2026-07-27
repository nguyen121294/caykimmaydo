export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

interface SyncLog {
  platform: string;
  recordsFetched: number;
  recordsSaved: number;
  syncedAt: string;
  error?: string;
}

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

// ===== FACEBOOK PAGE SYNC =====
async function syncFacebookPage(token: string, pageId?: string): Promise<SyncLog> {
  const log: SyncLog = { platform: 'Facebook Page', recordsFetched: 0, recordsSaved: 0, syncedAt: new Date().toISOString() };
  const today = new Date().toISOString().slice(0, 10);

  try {
    let effectiveToken = token;

    // Nếu có pageId, thử tìm Page Access Token riêng cho Page đó từ /me/accounts
    if (pageId) {
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,access_token&limit=100&access_token=${encodeURIComponent(token)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          const targetPage = (pagesData.data || []).find((p: any) => p.id === pageId);
          if (targetPage?.access_token) {
            effectiveToken = targetPage.access_token;
          }
        }
      } catch {}
    }

    // Verify token first
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(effectiveToken)}`, { signal: AbortSignal.timeout(15000) });
    const meData = await meRes.json();
    if (meData.error) {
      throw new Error(meData.error?.message || 'Token không hợp lệ');
    }

    // Lấy conversations từ Facebook Page API (Thử theo pageId trước, fallback về /me/conversations)
    let convRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId || 'me'}/conversations?fields=participants,messages.limit(1){message,from,created_time}&limit=25&access_token=${encodeURIComponent(effectiveToken)}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!convRes.ok && pageId) {
      // Fallback về /me/conversations nếu dùng Page Access Token
      convRes = await fetch(
        `https://graph.facebook.com/v19.0/me/conversations?fields=participants,messages.limit(1){message,from,created_time}&limit=25&access_token=${encodeURIComponent(effectiveToken)}`,
        { signal: AbortSignal.timeout(15000) }
      );
    }

    if (!convRes.ok) {
      const err = await convRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Facebook API lỗi: ${convRes.status}`);
    }

    const convData = await convRes.json();
    const conversations = convData?.data || [];
    log.recordsFetched = conversations.length;

    for (const conv of conversations) {
      const participant = conv?.participants?.data?.find((p: any) => p?.id !== 'me') || conv?.participants?.data?.[0];
      const lastMsg = conv?.messages?.data?.[0];
      const customerName = participant?.name || 'Khách Facebook';

      const inboxId = `fb_inbox_${conv.id}`;
      await prisma.inboxKpi.upsert({
        where: { id: inboxId },
        update: {
          lastMessage: lastMsg?.message || '',
          status: 'Đã phản hồi',
          updatedAt: new Date(),
        },
        create: {
          id: inboxId,
          date: today,
          customerType: 'Mới',
          status: 'Đã phản hồi',
          lastMessage: lastMsg?.message || '',
          result: 'Từ Facebook Page',
          agent: 'Facebook Page API',
        },
      });

      if (customerName && customerName !== 'Khách Facebook') {
        const existing = await prisma.customer.findFirst({
          where: { name: customerName, source: 'Facebook Page' },
        });
        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: { updatedAt: new Date() },
          });
        } else {
          await prisma.customer.create({
            data: {
              name: customerName,
              source: 'Facebook Page',
              status: 'Mới',
              tags: 'Facebook, Auto-sync',
            },
          });
        }
      }
      log.recordsSaved++;
    }

    return log;
  } catch (error: any) {
    log.error = error?.message || 'Lỗi không xác định';
    return log;
  }
}

// ===== FACEBOOK ADS SYNC =====
async function syncFacebookAds(token: string, adAccountId?: string): Promise<SyncLog> {
  const log: SyncLog = { platform: 'Facebook Ads', recordsFetched: 0, recordsSaved: 0, syncedAt: new Date().toISOString() };
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Verify token
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(15000) });
    const meData = await meRes.json();
    if (meData.error) {
      throw new Error(meData.error?.message || 'Token không hợp lệ');
    }

    // Lấy ad account ID nếu chưa có
    let actId = adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : '';
    if (!actId) {
      const actRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!actRes.ok) {
        const err = await actRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Facebook Ads API lỗi: ${actRes.status}`);
      }
      const actData = await actRes.json();
      const activeAcct = (actData?.data || []).find((a: any) => a.account_status === 1) || actData?.data?.[0];
      if (!activeAcct) throw new Error('Không tìm thấy Ad Account nào hoạt động. Kiểm tra token có quyền ads_read.');
      actId = activeAcct.id;
    }

    // Lấy campaigns + insights
    const campRes = await fetch(
      `https://graph.facebook.com/v19.0/${actId}/insights?fields=campaign_name,spend,impressions,clicks,reach,actions,action_values&date_preset=last_30d&level=campaign&limit=50&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(20000) }
    );

    if (!campRes.ok) {
      const err = await campRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Facebook Insights API lỗi: ${campRes.status}`);
    }

    const campData = await campRes.json();
    const rows = campData?.data || [];
    log.recordsFetched = rows.length;

    for (const row of rows) {
      const impressions = parseInt(row.impressions || '0');
      const clicks = parseInt(row.clicks || '0');
      const spend = parseFloat(row.spend || '0');
      const reach = parseInt(row.reach || '0');
      const actions = row.actions || [];
      const actionValues = row.action_values || [];

      const leads = parseInt(actions.find((a: any) => a.action_type === 'lead')?.value || '0');
      const purchases = parseInt(actions.find((a: any) => a.action_type === 'purchase')?.value || '0');
      const revenue = parseFloat(actionValues.find((a: any) => a.action_type === 'purchase')?.value || '0');
      const costPerLead = leads > 0 ? spend / leads : 0;

      const campName = row.campaign_name || 'Unknown Campaign';
      const testId = `meta_${campName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}_${today}`;

      await prisma.aBTest.upsert({
        where: { testId },
        update: {
          impressionsA: impressions,
          clicksA: clicks,
          budgetA: Math.round(spend * 25000),
          conversionsA: leads + purchases,
          revenueA: Math.round(revenue * 25000),
          updatedAt: new Date(),
        },
        create: {
          testId,
          testName: campName,
          dateStarted: today,
          variantA: `Reach: ${reach.toLocaleString()} | CPL: ${Math.round(costPerLead * 25000).toLocaleString()}đ`,
          variantB: `Leads: ${leads} | Purchases: ${purchases} | Revenue: ${Math.round(revenue * 25000).toLocaleString()}đ`,
          impressionsA: impressions,
          clicksA: clicks,
          budgetA: Math.round(spend * 25000),
          conversionsA: leads + purchases,
          revenueA: Math.round(revenue * 25000),
        },
      });

      if (spend > 0) {
        const financeId = `fb_spend_${campName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${today}`;
        const existingFinance = await prisma.financeEntry.findFirst({
          where: { description: { contains: financeId } },
        });
        if (!existingFinance) {
          await prisma.financeEntry.create({
            data: {
              date: today,
              type: 'Chi',
              category: 'Quảng cáo Facebook',
              description: `[${financeId}] ${campName} | Imp:${impressions} Click:${clicks} Lead:${leads} Purchase:${purchases}`,
              amount: Math.round(spend * 25000),
            },
          });
        }
      }

      log.recordsSaved++;
    }

    return log;
  } catch (error: any) {
    log.error = error?.message || 'Lỗi không xác định';
    return log;
  }
}

// ===== INSTAGRAM SYNC =====
async function syncInstagram(token: string, igAccountId?: string): Promise<SyncLog> {
  const log: SyncLog = { platform: 'Instagram', recordsFetched: 0, recordsSaved: 0, syncedAt: new Date().toISOString() };

  try {
    let igId = igAccountId;
    if (!igId) {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const pagesData = await pagesRes.json();
      const page = (pagesData?.data || []).find((p: any) => p.instagram_business_account);
      if (!page) throw new Error('Không tìm thấy tài khoản Instagram Business. Kiểm tra quyền instagram_basic và pages_show_list.');
      igId = page.instagram_business_account.id;
    }

    // Lấy media gần nhất
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type,permalink&limit=25&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!mediaRes.ok) {
      const err = await mediaRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Instagram API lỗi: ${mediaRes.status}`);
    }

    const mediaData = await mediaRes.json();
    const posts = mediaData?.data || [];
    log.recordsFetched = posts.length;

    for (const post of posts) {
      const trackingId = `ig_${post.id}`;
      const existing = await prisma.contentTracking.findFirst({ where: { contentId: trackingId } });
      if (existing) {
        await prisma.contentTracking.update({
          where: { id: existing.id },
          data: {
            saves: String(post.like_count ?? 0),
            comments: String(post.comments_count ?? 0),
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.contentTracking.create({
          data: {
            contentId: trackingId,
            channel: 'Instagram',
            contentType: post.media_type || 'IMAGE',
            views: '0',
            saves: String(post.like_count ?? 0),
            comments: String(post.comments_count ?? 0),
            shares: '0',
          },
        });
      }
      log.recordsSaved++;
    }

    return log;
  } catch (error: any) {
    log.error = error?.message || 'Lỗi không xác định';
    return log;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedPlatform = body?.platform;

    const results: SyncLog[] = [];
    let totalFetched = 0;
    let totalSaved = 0;
    const errors: string[] = [];

    // ===== Facebook Page =====
    if (!requestedPlatform || requestedPlatform === 'Facebook Page') {
      const { token, pageId } = await getTokenForPlatform('Facebook Page');
      if (!token) {
        results.push({
          platform: 'Facebook Page',
          recordsFetched: 0, recordsSaved: 0,
          syncedAt: new Date().toISOString(),
          error: 'Chưa có token hợp lệ. Vui lòng kết nối trước.',
        });
        errors.push('Facebook Page: Chưa có token hợp lệ');
      } else {
        const pageLog = await syncFacebookPage(token, pageId);
        results.push(pageLog);
        totalFetched += pageLog.recordsFetched;
        totalSaved += pageLog.recordsSaved;
        if (pageLog.error) errors.push(`Facebook Page: ${pageLog.error}`);
        await prisma.platformCredential.update({
          where: { platform: 'Facebook Page' },
          data: { lastTested: new Date() },
        }).catch(() => {});
      }
    }

    // ===== Facebook Ads =====
    if (!requestedPlatform || requestedPlatform === 'Facebook Ads') {
      const { token, adAccountId } = await getTokenForPlatform('Facebook Ads');
      if (!token) {
        results.push({
          platform: 'Facebook Ads',
          recordsFetched: 0, recordsSaved: 0,
          syncedAt: new Date().toISOString(),
          error: 'Chưa có token hợp lệ. Vui lòng kết nối trước.',
        });
        errors.push('Facebook Ads: Chưa có token hợp lệ');
      } else {
        const adsLog = await syncFacebookAds(token, adAccountId);
        results.push(adsLog);
        totalFetched += adsLog.recordsFetched;
        totalSaved += adsLog.recordsSaved;
        if (adsLog.error) errors.push(`Facebook Ads: ${adsLog.error}`);
        await prisma.platformCredential.update({
          where: { platform: 'Facebook Ads' },
          data: { lastTested: new Date() },
        }).catch(() => {});
      }
    }

    // ===== Instagram =====
    if (!requestedPlatform || requestedPlatform === 'Instagram') {
      const { token, igAccountId } = await getTokenForPlatform('Instagram');
      if (token) {
        const igLog = await syncInstagram(token, igAccountId);
        results.push(igLog);
        totalFetched += igLog.recordsFetched;
        totalSaved += igLog.recordsSaved;
        if (igLog.error) errors.push(`Instagram: ${igLog.error}`);
        await prisma.platformCredential.update({
          where: { platform: 'Instagram' },
          data: { lastTested: new Date() },
        }).catch(() => {});
      } else if (requestedPlatform === 'Instagram') {
        results.push({
          platform: 'Instagram',
          recordsFetched: 0, recordsSaved: 0,
          syncedAt: new Date().toISOString(),
          error: 'Chưa có token hợp lệ. Vui lòng kết nối trước.',
        });
        errors.push('Instagram: Chưa có token hợp lệ');
      }
    }

    // Log vào AutomationLog
    for (const r of results) {
      await prisma.automationLog.create({
        data: {
          level: r.error ? 'error' : 'info',
          source: `sync-meta/${r.platform}`,
          message: r.error
            ? `Lỗi đồng bộ ${r.platform}: ${r.error}`
            : `Đồng bộ ${r.platform}: ${r.recordsFetched} lấy về, ${r.recordsSaved} đã lưu`,
          details: JSON.stringify(r),
        },
      });
    }

    const allFailed = results.length > 0 && results.every(r => !!r.error);

    if (allFailed) {
      return NextResponse.json({
        success: false,
        error: errors.join(' | '),
        results,
        recordsFetched: 0,
        recordsSaved: 0,
        syncedAt: new Date().toISOString(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      recordsFetched: totalFetched,
      recordsSaved: totalSaved,
      syncedAt: new Date().toISOString(),
      results,
      message: totalSaved > 0
        ? `Đồng bộ thành công: ${totalFetched} bản ghi lấy về, ${totalSaved} bản ghi đã lưu`
        : 'Đã kết nối nhưng chưa có dữ liệu mới',
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    try {
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-meta',
          message: `Lỗi hệ thống: ${error?.message ?? 'Unknown'}`,
          details: JSON.stringify({ error: error?.message }),
        },
      });
    } catch { /* silent */ }
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Lỗi server khi đồng bộ Meta' },
      { status: 500 }
    );
  }
}

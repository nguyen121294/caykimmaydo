import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export interface SyncLog {
  platform: string;
  recordsFetched: number;
  recordsSaved: number;
  syncedAt: string;
  error?: string;
}

export async function getTokenForPlatform(platform: string): Promise<{ token: string | null; pageId?: string; adAccountId?: string; igAccountId?: string }> {
  let credential = await prisma.platformCredential.findUnique({ where: { platform } });
  
  // Fallback: Nếu platform là Instagram nhưng chưa kết nối riêng, thử dùng token của Facebook Page
  if ((!credential || !credential.isConnected) && platform === 'Instagram') {
    credential = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Page' } });
  }

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
export async function syncFacebookPage(token: string, pageId?: string): Promise<SyncLog> {
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

    // Lấy bài viết xuất bản (published_posts) từ Fanpage để đồng bộ vào FacebookPost
    try {
      const targetId = pageId || 'me';
      const fields = 'id,message,full_picture,permalink_url,created_time,reactions.summary(true),comments.summary(true),shares';
      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${targetId}/published_posts?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(effectiveToken)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const postsList = fbData.data || [];
        log.recordsFetched += postsList.length;

        for (const post of postsList) {
          if (!post.id) continue;
          const likesCount = post.reactions?.summary?.total_count ?? 0;
          const commentsCount = post.comments?.summary?.total_count ?? 0;
          const sharesCount = post.shares?.count ?? 0;
          const viewsCount = Math.max(likesCount * 12 + commentsCount * 25, likesCount + 50);

          await prisma.facebookPost.upsert({
            where: { postId: post.id },
            update: {
              pageId,
              message: post.message || '',
              picture: post.full_picture || '',
              permalinkUrl: post.permalink_url || `https://facebook.com/${post.id}`,
              createdTime: post.created_time ? new Date(post.created_time) : new Date(),
              likesCount,
              viewsCount,
              commentsCount,
              sharesCount,
              syncedAt: new Date(),
            },
            create: {
              postId: post.id,
              pageId,
              message: post.message || '',
              picture: post.full_picture || '',
              permalinkUrl: post.permalink_url || `https://facebook.com/${post.id}`,
              createdTime: post.created_time ? new Date(post.created_time) : new Date(),
              likesCount,
              viewsCount,
              commentsCount,
              sharesCount,
              syncedAt: new Date(),
            },
          });
          log.recordsSaved++;
        }
      }
    } catch { /* silent */ }

    return log;
  } catch (error: any) {
    log.error = error?.message || 'Lỗi không xác định';
    return log;
  }
}

// ===== FACEBOOK ADS SYNC =====
export async function syncFacebookAds(token: string, adAccountId?: string): Promise<SyncLog> {
  const log: SyncLog = { platform: 'Facebook Ads', recordsFetched: 0, recordsSaved: 0, syncedAt: new Date().toISOString() };
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Verify token
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(15000) });
    const meData = await meRes.json();
    if (meData.error) {
      throw new Error(meData.error?.message || 'Token không hợp lệ');
    }

    // Lấy ad account ID + currency nếu chưa có
    let actId = adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : '';
    let accountCurrency = 'USD';
    if (!actId) {
      const actRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${encodeURIComponent(token)}`,
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
      accountCurrency = activeAcct.currency || 'USD';
    } else {
      // Fetch currency for known actId
      try {
        const currRes = await fetch(
          `https://graph.facebook.com/v19.0/${actId}?fields=currency&access_token=${encodeURIComponent(token)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (currRes.ok) {
          const currData = await currRes.json();
          accountCurrency = currData?.currency || 'USD';
        }
      } catch { /* fallback to USD */ }
    }

    // Dọn dẹp dữ liệu cũ (chỉ chạy 1 lần nếu phát hiện có dữ liệu cũ chưa được format đúng)
    // Dữ liệu cũ thường có ID chứa ngày hôm nay thay vì date_start
    const hasOldData = await prisma.financeEntry.findFirst({
      where: { description: { contains: 'fb_spend_' } }
    });
    
    // Facebook API trả spend theo đơn vị currency của ad account
    // Nếu VND → dùng trực tiếp, nếu USD → nhân tỷ giá
    const currencyMultiplier = accountCurrency === 'VND' ? 1 : 25000;

    // Lấy campaigns + insights theo từng ngày (time_increment=1)
    let url = `https://graph.facebook.com/v19.0/${actId}/insights?fields=campaign_name,spend,impressions,clicks,reach,actions,action_values&date_preset=maximum&time_increment=1&level=campaign&limit=500&access_token=${encodeURIComponent(token)}`;
    let hasNextPage = true;
    let pagesFetched = 0;
    const allRows: any[] = [];

    while (hasNextPage && url && pagesFetched < 10) {
      const campRes = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!campRes.ok) {
        const err = await campRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Facebook Insights API lỗi: ${campRes.status}`);
      }
      
      const campData = await campRes.json();
      const rows = campData?.data || [];
      allRows.push(...rows);
      
      if (campData?.paging?.next) {
        url = campData.paging.next;
        pagesFetched++;
      } else {
        hasNextPage = false;
      }
    }

    log.recordsFetched = allRows.length;

    // Nếu đây là lần đầu tiên chạy bản mới, wipe dữ liệu ABTest và FinanceEntry cũ
    // (Bởi vì data cũ lưu tổng 30 ngày vào 1 ngày).
    // Xoá tất cả ABTest và FinanceEntry tự động.
    if (hasOldData) {
      await prisma.aBTest.deleteMany({});
      await prisma.financeEntry.deleteMany({
        where: { description: { contains: 'fb_spend_' } }
      });
    }

    for (const row of allRows) {
      const dateStart = row.date_start; // Ngày thực tế của row data
      if (!dateStart) continue;

      const impressions = parseInt(row.impressions || '0');
      const clicks = parseInt(row.clicks || '0');
      const spend = parseFloat(row.spend || '0');
      const reach = parseInt(row.reach || '0');
      const actions = row.actions || [];
      const actionValues = row.action_values || [];

      // Nếu không tiêu tiền và không có click/impression thì bỏ qua để tránh rác
      if (spend === 0 && impressions === 0 && clicks === 0) continue;

      const leads = parseInt(actions.find((a: any) => a.action_type === 'lead')?.value || '0');
      const purchases = parseInt(actions.find((a: any) => a.action_type === 'purchase')?.value || '0');
      const revenue = parseFloat(actionValues.find((a: any) => a.action_type === 'purchase')?.value || '0');
      const costPerLead = leads > 0 ? spend / leads : 0;

      const spendVnd = Math.round(spend * currencyMultiplier);
      const revenueVnd = Math.round(revenue * currencyMultiplier);
      const costPerLeadVnd = Math.round(costPerLead * currencyMultiplier);

      const campName = row.campaign_name || 'Unknown Campaign';
      const testId = `meta_${campName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${dateStart}`;

      const campNameLower = campName.toLowerCase();
      const isInstagramPlacement = campNameLower.includes('instagram') && !campNameLower.includes('facebook');
      const adCategory = isInstagramPlacement ? 'Quảng cáo Instagram' : 'Quảng cáo Facebook';

      await prisma.aBTest.upsert({
        where: { testId },
        update: {
          impressionsA: impressions,
          clicksA: clicks,
          budgetA: spendVnd,
          conversionsA: leads + purchases,
          revenueA: revenueVnd,
          updatedAt: new Date(),
        },
        create: {
          testId,
          testName: campName,
          dateStarted: dateStart,
          variantA: `Reach: ${reach.toLocaleString()} | CPL: ${costPerLeadVnd.toLocaleString()}đ`,
          variantB: `Leads: ${leads} | Purchases: ${purchases} | Revenue: ${revenueVnd.toLocaleString()}đ`,
          impressionsA: impressions,
          clicksA: clicks,
          budgetA: spendVnd,
          conversionsA: leads + purchases,
          revenueA: revenueVnd,
        },
      });

      if (spend > 0) {
        const financeId = `fb_spend_${campName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${dateStart}`;
        const existingFinance = await prisma.financeEntry.findFirst({
          where: { description: { contains: financeId } },
        });
        if (!existingFinance) {
          await prisma.financeEntry.create({
            data: {
              date: dateStart,
              type: 'Chi',
              category: adCategory,
              description: `[${financeId}] ${campName} | Imp:${impressions} Click:${clicks}`,
              amount: spendVnd,
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
export async function syncInstagram(token: string, igAccountId?: string): Promise<SyncLog> {
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

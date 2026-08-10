import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export interface SyncLog {
  platform: string;
  recordsFetched: number;
  recordsSaved: number;
  syncedAt: string;
  error?: string;
  progress?: {
    fetched: number;
    saved: number;
    complete: boolean;
    hasMore: boolean;
    cursor?: string;
  };
}

export interface MetaBatchOptions {
  batch?: boolean;
  cursor?: string;
  pageLimit?: number;
  skipPostAds?: boolean;
}

export interface PostAdsProgress {
  fetched: number;
  saved: number;
  complete: boolean;
  hasMore: boolean;
  cursor?: string;
}

export type SyncDays = '7' | '30' | '90' | 'all';

function normalizeSyncDays(value: unknown): SyncDays {
  return value === '7' || value === '30' || value === '90' || value === 'all' ? value : '30';
}

function getMetaDateFilter(value: unknown) {
  const days = normalizeSyncDays(value);
  if (days === 'all') return 'date_preset=maximum';

  const until = new Date();
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - Number(days) + 1);
  const range = {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  };
  return `time_range=${encodeURIComponent(JSON.stringify(range))}`;
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
export async function syncFacebookPage(token: string, pageId?: string, days?: unknown): Promise<SyncLog> {
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
    const cutoff = normalizeSyncDays(days) === 'all'
      ? null
      : new Date(Date.now() - Number(normalizeSyncDays(days)) * 24 * 60 * 60 * 1000);
    const conversations = (convData?.data || []).filter((conv: any) => {
      const createdAt = conv?.messages?.data?.[0]?.created_time;
      return !cutoff || !createdAt || new Date(createdAt) >= cutoff;
    });
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
export async function syncFacebookAds(token: string, adAccountId?: string, days?: unknown, options?: MetaBatchOptions): Promise<SyncLog> {
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

    // Facebook API trả spend theo đơn vị currency của ad account
    // Nếu VND → dùng trực tiếp, nếu USD → nhân tỷ giá
    const currencyMultiplier = accountCurrency === 'VND' ? 1 : 25000;

    // Lấy campaigns + insights theo từng ngày (time_increment=1)
    const dateFilter = getMetaDateFilter(days);
    const after = options?.cursor ? `&after=${encodeURIComponent(options.cursor)}` : '';
    const campaignLimit = options?.batch ? 20 : 100;
    let url = `https://graph.facebook.com/v19.0/${actId}/insights?fields=campaign_name,spend,impressions,clicks,reach,actions,action_values&${dateFilter}&time_increment=1&level=campaign&limit=${campaignLimit}${after}&access_token=${encodeURIComponent(token)}`;
    let hasNextPage = true;
    let pagesFetched = 0;
    let nextCursor: string | undefined;
    const allRows: any[] = [];

    const campaignPageLimit = options?.pageLimit ?? (options?.batch ? 1 : 10);
    while (hasNextPage && url && pagesFetched < campaignPageLimit) {
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
        nextCursor = campData?.paging?.cursors?.after;
      } else {
        hasNextPage = false;
        nextCursor = undefined;
      }
      pagesFetched++;
    }

    log.recordsFetched = allRows.length;

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
      const linkClicks = parseInt(actions.find((a: any) => a.action_type === 'link_click')?.value || '0');
      const landingPageViews = parseInt(actions.find((a: any) => a.action_type === 'landing_page_view')?.value || '0');
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
      const variantA = `Reach: ${reach.toLocaleString()} | CPL: ${costPerLeadVnd.toLocaleString()}đ`;
      const variantB = `Leads: ${leads} | Purchases: ${purchases} | Revenue: ${revenueVnd.toLocaleString()}đ`;

      await prisma.aBTest.upsert({
        where: { testId },
        update: {
          testName: campName,
          dateStarted: dateStart,
          variantA,
          variantB,
          impressionsA: impressions,
          clicksA: clicks,
          linkClicksA: linkClicks,
          landingPageViewsA: landingPageViews,
          budgetA: spendVnd,
          conversionsA: leads + purchases,
          revenueA: revenueVnd,
          updatedAt: new Date(),
        },
        create: {
          testId,
          testName: campName,
          dateStarted: dateStart,
          variantA,
          variantB,
          impressionsA: impressions,
          clicksA: clicks,
          linkClicksA: linkClicks,
          landingPageViewsA: landingPageViews,
          budgetA: spendVnd,
          conversionsA: leads + purchases,
          revenueA: revenueVnd,
        },
      });

      if (spend > 0) {
        const financeId = `fb_spend_${campName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${dateStart}`;
        const financeData = {
          date: dateStart,
          type: 'Chi',
          category: adCategory,
          description: `[${financeId}] ${campName} | Imp:${impressions} Click:${clicks}`,
          amount: spendVnd,
        };
        const existingFinance = await prisma.financeEntry.findFirst({
          where: { description: { contains: financeId } },
        });
        await (existingFinance
          ? prisma.financeEntry.update({ where: { id: existingFinance.id }, data: financeData })
          : prisma.financeEntry.create({ data: financeData }));
      }

      log.recordsSaved++;
    }

    if (options?.batch) {
      log.progress = {
        fetched: log.recordsFetched,
        saved: log.recordsSaved,
        complete: !nextCursor,
        hasMore: Boolean(nextCursor),
        cursor: nextCursor,
      };
    } else if (!options?.skipPostAds) {
      const postAdsProgress = await syncPostAdsInsights(token, actId, days);
      if (postAdsProgress) log.progress = postAdsProgress;
    }

    return log;
  } catch (error: any) {
    log.error = error?.message || 'Lỗi không xác định';
    return log;
  }
}

// ===== INSTAGRAM SYNC =====
export async function syncInstagram(token: string, igAccountId?: string, days?: unknown): Promise<SyncLog> {
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

    const selectedDays = normalizeSyncDays(days);
    const cutoff = selectedDays === 'all' ? null : new Date(Date.now() - Number(selectedDays) * 24 * 60 * 60 * 1000);

    let nextUrl: string | null = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type,permalink&limit=25&access_token=${encodeURIComponent(token)}`;
    const allPosts: any[] = [];
    let pageCount = 0;
    const maxPages = selectedDays === 'all' ? 10 : 5;

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      const mediaRes = await fetch(nextUrl, { signal: AbortSignal.timeout(15000) });

      if (!mediaRes.ok) {
        const err = await mediaRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Instagram API lỗi: ${mediaRes.status}`);
      }

      const mediaData = await mediaRes.json();
      const pagePosts = mediaData?.data || [];
      if (pagePosts.length === 0) break;

      let reachedCutoff = false;
      for (const post of pagePosts) {
        if (cutoff && post.timestamp && new Date(post.timestamp) < cutoff) {
          reachedCutoff = true;
          break;
        }
        allPosts.push(post);
      }

      if (reachedCutoff || !mediaData?.paging?.next) {
        break;
      }
      nextUrl = mediaData.paging.next;
    }

    log.recordsFetched = allPosts.length;
    if (allPosts.length === 0) {
      return log;
    }

    // Tối ưu hóa Database Writes bằng Bulk Operations (1 Transaction)
    const trackingIds = allPosts.map(post => `ig_${post.id}`);
    const existingTrackings = await prisma.contentTracking.findMany({
      where: { contentId: { in: trackingIds } },
    });
    const existingTrackingMap = new Map(existingTrackings.map(t => [t.contentId, t]));

    const dbOperations: any[] = [];

    for (const post of allPosts) {
      const trackingId = `ig_${post.id}`;
      const existing = existingTrackingMap.get(trackingId);

      if (existing) {
        dbOperations.push(
          prisma.contentTracking.update({
            where: { id: existing.id },
            data: {
              saves: String(post.like_count ?? 0),
              comments: String(post.comments_count ?? 0),
              updatedAt: new Date(),
            },
          })
        );
      } else {
        dbOperations.push(
          prisma.contentTracking.create({
            data: {
              contentId: trackingId,
              channel: 'Instagram',
              contentType: post.media_type || 'IMAGE',
              views: '0',
              saves: String(post.like_count ?? 0),
              comments: String(post.comments_count ?? 0),
              shares: '0',
            },
          })
        );
      }

      dbOperations.push(
        prisma.instagramPost.upsert({
          where: { postId: post.id },
          update: {
            igAccountId: igId,
            caption: post.caption || '',
            mediaType: post.media_type || 'IMAGE',
            mediaUrl: '',
            permalinkUrl: post.permalink || `https://instagram.com/p/${post.id}`,
            createdTime: post.timestamp ? new Date(post.timestamp) : new Date(),
            likesCount: post.like_count || 0,
            commentsCount: post.comments_count || 0,
            syncedAt: new Date(),
          },
          create: {
            postId: post.id,
            igAccountId: igId,
            caption: post.caption || '',
            mediaType: post.media_type || 'IMAGE',
            mediaUrl: '',
            permalinkUrl: post.permalink || `https://instagram.com/p/${post.id}`,
            createdTime: post.timestamp ? new Date(post.timestamp) : new Date(),
            likesCount: post.like_count || 0,
            commentsCount: post.comments_count || 0,
          },
        })
      );
    }

    await prisma.$transaction(dbOperations);
    log.recordsSaved = allPosts.length;

    return log;
  } catch (error: any) {
    log.error = error?.message || 'Lỗi không xác định';
    return log;
  }
}

// ===== POST ADS INSIGHTS SYNC =====
export async function syncPostAdsInsights(token: string, adAccountId?: string, days?: unknown, options?: MetaBatchOptions): Promise<PostAdsProgress | undefined> {
  try {
    let actId = adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : '';
    if (!actId) {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_status&limit=100&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!accountsRes.ok) {
        const errorData = await accountsRes.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Không lấy được Meta Ad Account (${accountsRes.status}).`);
      }
      const accountsData = await accountsRes.json();
      const account = (accountsData?.data || []).find((item: any) => item.account_status === 1) || accountsData?.data?.[0];
      if (!account?.id) throw new Error('Không tìm thấy Meta Ad Account hoạt động.');
      actId = account.id;
    }

    const mergeActions = (current: any[] = [], incoming: any[] = []) => {
      const totals = new Map(current.map(action => [action.action_type, Number(action.value || 0)]));
      for (const action of incoming) {
        totals.set(action.action_type, (totals.get(action.action_type) || 0) + Number(action.value || 0));
      }
      return Array.from(totals, ([action_type, value]) => ({ action_type, value: String(value) }));
    };

    // Full-history sync is deliberately processed in resumable batches. This avoids
    // losing progress when Meta rate-limits a request or the server reaches its timeout.
    const selectedDays = normalizeSyncDays(days);
    const checkpointKey = `instagram_ads_full_sync_v2_${actId}`;
    let checkpoint: { cursor?: string; fetched?: number; saved?: number; complete?: boolean } = options?.cursor
      ? { cursor: options.cursor }
      : {};
    if (selectedDays === 'all' && !options?.batch) {
      const stored = await prisma.appSetting.findUnique({ where: { key: checkpointKey } });
      if (stored) checkpoint = JSON.parse(stored.value);
      if (checkpoint.complete) {
        return { fetched: checkpoint.fetched || 0, saved: checkpoint.saved || 0, complete: true, hasMore: false };
      }
    }

    const dateFilter = getMetaDateFilter(days);
    const after = checkpoint.cursor ? `&after=${encodeURIComponent(checkpoint.cursor)}` : '';
    const insightsLimit = options?.batch ? 2 : 25;
    let insightsUrl = `https://graph.facebook.com/v19.0/${actId}/insights?level=ad&${dateFilter}&breakdowns=publisher_platform&fields=ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,spend,reach,actions,outbound_clicks&limit=${insightsLimit}${after}&access_token=${encodeURIComponent(token)}`;
    const adInsightsMap = new Map<string, any>();
    
    let hasNextInsights = true;
    let pagesInsightsFetched = 0;

    let nextCursor: string | undefined;
    const pageLimit = options?.pageLimit ?? (options?.batch ? 1 : (selectedDays === 'all' ? 1 : 20));
    let rowsFetched = 0;

    while (hasNextInsights && insightsUrl && pagesInsightsFetched < pageLimit) {
      const res = await fetch(insightsUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Meta Insights API lỗi: ${res.status}`);
      }
      const data = await res.json();
      const rows = data?.data || [];
      rowsFetched += rows.length;
      for (const row of rows) {
        if (!row.ad_id || row.publisher_platform !== 'instagram' || parseFloat(row.spend || '0') <= 0) continue;

        const current = adInsightsMap.get(row.ad_id);
        adInsightsMap.set(row.ad_id, current ? {
          ...current,
          spend: String(parseFloat(current.spend || '0') + parseFloat(row.spend || '0')),
          reach: String(parseInt(current.reach || '0') + parseInt(row.reach || '0')),
          actions: mergeActions(current.actions, row.actions),
          outbound_clicks: mergeActions(current.outbound_clicks, row.outbound_clicks),
        } : row);
      }
      if (data?.paging?.next) {
        insightsUrl = data.paging.next;
        nextCursor = data?.paging?.cursors?.after;
        pagesInsightsFetched++;
      } else {
        hasNextInsights = false;
      }
    }

    if (adInsightsMap.size === 0 && !nextCursor) {
      const result = { fetched: (checkpoint.fetched || 0) + rowsFetched, saved: checkpoint.saved || 0, complete: true, hasMore: false };
      if (selectedDays === 'all' && !options?.batch) {
        await prisma.appSetting.upsert({ where: { key: checkpointKey }, update: { value: JSON.stringify({ ...result, cursor: null }) }, create: { key: checkpointKey, value: JSON.stringify({ ...result, cursor: null }) } });
      }
      return result;
    }

    // 2. Fetch Ads metadata & creatives for all ads in bulk
    let adsUrl = `https://graph.facebook.com/v19.0/${actId}/ads?fields=id,name,status,creative{effective_object_story_id,effective_instagram_story_id,object_story_id,body,name,thumbnail_url,instagram_permalink_url}&limit=200&access_token=${encodeURIComponent(token)}`;
    const adsMap = new Map<string, any>();

    let hasNextAds = true;
    let pagesAdsFetched = 0;

    const adsPageLimit = options?.batch ? 2 : 10;
    while (hasNextAds && adsUrl && pagesAdsFetched < adsPageLimit) {
      const res = await fetch(adsUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) break;
      const data = await res.json();
      const ads = data?.data || [];
      for (const ad of ads) {
        if (ad.id) adsMap.set(ad.id, ad);
      }
      if (data?.paging?.next) {
        adsUrl = data.paging.next;
        pagesAdsFetched++;
      } else {
        hasNextAds = false;
      }
    }

    // 3. Process each ad that spent money
    for (const [adId, insights] of adInsightsMap.entries()) {
      let ad = adsMap.get(adId);
      
      // If ad creative not found in bulk fetch, fetch directly
      if (!ad) {
        try {
          const adRes = await fetch(
            `https://graph.facebook.com/v19.0/${adId}?fields=id,name,status,creative{effective_object_story_id,effective_instagram_story_id,object_story_id,body,name,thumbnail_url,instagram_permalink_url}&access_token=${encodeURIComponent(token)}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (adRes.ok) ad = await adRes.json();
        } catch {}
      }

      const fbStoryId = ad?.creative?.effective_object_story_id || ad?.creative?.object_story_id;
      const igStoryId = ad?.creative?.effective_instagram_story_id;
      
      const storyId = igStoryId || fbStoryId;
      const spend = parseFloat(insights.spend || '0');
      if (spend <= 0) continue;

      const postIdRaw = storyId ? (storyId.includes('_') ? storyId.split('_')[1] : storyId) : null;
      const reach = parseInt(insights.reach || '0');
      const outboundClicks = insights.outbound_clicks?.find((item: any) => item.action_type === 'outbound_click')?.value || '0';
      const linkClicks = insights.actions?.find((item: any) => item.action_type === 'link_click')?.value || '0';
      const actionValue = (...types: string[]) => Math.round(types.reduce((sum, type) => sum + Number(insights.actions?.find((item: any) => item.action_type === type)?.value || 0), 0));
      const likesCount = actionValue('post_reaction', 'like');
      const commentsCount = actionValue('comment');
      const sharesCount = actionValue('post', 'share');
      const engagementCount = actionValue('post_engagement') || likesCount + commentsCount + sharesCount;
      const adVisits = parseInt(outboundClicks) || parseInt(linkClicks) || 0;
      const adStatus = ad?.status === 'ACTIVE' ? 'Đang chạy' : (ad?.status === 'PAUSED' ? 'Tạm dừng' : (ad?.status || 'ARCHIVED'));
      const adData = {
        adName: insights.ad_name || ad?.name,
        campaignId: insights.campaign_id,
        campaignName: insights.campaign_name,
        adSetId: insights.adset_id,
        adSetName: insights.adset_name,
        postId: igStoryId || postIdRaw,
        caption: ad?.creative?.body || ad?.creative?.name || insights.ad_name || ad?.name,
        mediaUrl: ad?.creative?.thumbnail_url || '',
        permalinkUrl: ad?.creative?.instagram_permalink_url || '',
        status: adStatus,
        spend,
        reach,
        visits: adVisits,
        likesCount,
        commentsCount,
        sharesCount,
        engagementCount,
        syncedAt: new Date(),
      };

      await prisma.instagramAd.upsert({
        where: { adId },
        update: adData,
        create: { adId, ...adData },
      });

      let fbPost = (fbStoryId || postIdRaw) ? await prisma.facebookPost.findFirst({
        where: { OR: [ { postId: fbStoryId || '' }, { postId: { endsWith: postIdRaw || '' } } ] }
      }) : null;
      let igPost = (igStoryId || postIdRaw) ? await prisma.instagramPost.findFirst({
        where: { OR: [ { postId: igStoryId || '' }, { postId: { endsWith: postIdRaw || '' } } ] }
      }) : null;

      // Create record if neither exists
      if (!fbPost && !igPost) {
        const caption = ad?.creative?.body || ad?.creative?.name || insights.ad_name || ad?.name || '[Bài QC cũ]';
        const mediaUrl = ad?.creative?.thumbnail_url || '';
        const isIg = Boolean(igStoryId || ad?.creative?.instagram_permalink_url);

        try {
          if (isIg) {
            igPost = await prisma.instagramPost.create({
              data: {
                postId: igStoryId || postIdRaw || adId,
                caption: caption,
                mediaUrl: mediaUrl,
                permalinkUrl: ad?.creative?.instagram_permalink_url || '',
                createdTime: new Date(),
                adStatus: ad?.status === 'ACTIVE' ? 'Đang chạy' : (ad?.status === 'PAUSED' ? 'Tạm dừng' : (ad?.status || 'ARCHIVED'))
              }
            });
          } else {
            fbPost = await prisma.facebookPost.create({
              data: {
                postId: fbStoryId || postIdRaw || adId,
                message: caption,
                picture: mediaUrl,
                createdTime: new Date(),
                adStatus: ad?.status === 'ACTIVE' ? 'Đang chạy' : (ad?.status === 'PAUSED' ? 'Tạm dừng' : (ad?.status || 'ARCHIVED'))
              }
            });
          }
        } catch (e) {
          console.error('Error creating dark post:', e);
        }
      }

      if (!fbPost && !igPost) continue;

      // Fetch Demographics
      const [demoRes, regionRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v19.0/${adId}/insights?${dateFilter}&fields=reach&breakdowns=age,gender&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
        fetch(`https://graph.facebook.com/v19.0/${adId}/insights?${dateFilter}&fields=reach&breakdowns=region&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(8000) }).catch(() => null)
      ]);

      const demoData = await demoRes?.json().catch(() => ({})) || {};
      const regionData = await regionRes?.json().catch(() => ({})) || {};

      const ageGenderRows = demoData.data || [];
      const regionRows = regionData.data || [];

      let femaleReach = 0;
      let totalReachDemo = 0;
      const ageReach = new Map<string, number>();

      ageGenderRows.forEach((row: any) => {
        const r = parseInt(row.reach || '0');
        totalReachDemo += r;
        if (row.gender === 'female') femaleReach += r;
        if (row.age) ageReach.set(row.age, (ageReach.get(row.age) || 0) + r);
      });

      let totalReachRegion = 0;
      const regionReach = new Map<string, number>();

      regionRows.forEach((row: any) => {
        const r = parseInt(row.reach || '0');
        totalReachRegion += r;
        if (row.region) regionReach.set(row.region, (regionReach.get(row.region) || 0) + r);
      });

      const regions = Array.from(regionReach, ([name, reach]) => ({
        name,
        reach,
        percent: totalReachRegion > 0 ? Math.round((reach / totalReachRegion) * 100) : 0,
      })).sort((a, b) => b.reach - a.reach);
      const ageGroups = Array.from(ageReach, ([name, reach]) => ({
        name,
        reach,
        percent: totalReachDemo > 0 ? Math.round((reach / totalReachDemo) * 100) : 0,
      })).sort((a, b) => a.name.localeCompare(b.name));

      const demographics = {
        available: totalReachDemo > 0 || totalReachRegion > 0,
        femalePercent: totalReachDemo > 0 ? Math.round((femaleReach / totalReachDemo) * 100) : null,
        regions,
        ageGroups,
      };

      await prisma.instagramAd.update({ where: { adId }, data: { demographics: demographics as any } });

      if (fbPost) {
        await prisma.facebookPost.update({
          where: { id: fbPost.id },
          data: { adSpend: spend, adReach: reach, adVisits, adStatus, demographics: demographics as any }
        });
      }
      if (igPost) {
        await prisma.instagramPost.update({
          where: { id: igPost.id },
          data: { adSpend: spend, adReach: reach, adVisits, adStatus, demographics: demographics as any }
        });
      }
    }

    const result = {
      fetched: (checkpoint.fetched || 0) + rowsFetched,
      saved: (checkpoint.saved || 0) + adInsightsMap.size,
      complete: !nextCursor,
      hasMore: Boolean(nextCursor),
      cursor: nextCursor,
    };
    if (selectedDays === 'all' && !options?.batch) {
      await prisma.appSetting.upsert({
        where: { key: checkpointKey },
        update: { value: JSON.stringify({ ...result, cursor: nextCursor || null }) },
        create: { key: checkpointKey, value: JSON.stringify({ ...result, cursor: nextCursor || null }) },
      });
    }
    return result;
  } catch (error) {
    console.error('Error syncing post ad insights:', error);
    throw error;
  }
}

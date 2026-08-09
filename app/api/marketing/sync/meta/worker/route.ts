import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignatureEdge } from '@upstash/qstash/nextjs';
import { getTokenForPlatform, syncFacebookPage, syncFacebookAds, syncInstagram, SyncLog } from '@/lib/sync-meta-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 phút timeout cho route này (nếu được support bởi platform)

async function handler(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedPlatform = body?.platform;
    const days = body?.days;

    if (!requestedPlatform) {
      return NextResponse.json({ success: false, error: 'Thiếu platform' }, { status: 400 });
    }

    const errors: string[] = [];
    let log: SyncLog | null = null;

    if (requestedPlatform === 'Facebook Page') {
      const { token, pageId } = await getTokenForPlatform('Facebook Page');
      if (!token) {
        errors.push('Facebook Page: Chưa có token hợp lệ');
      } else {
        log = await syncFacebookPage(token, pageId, days);
        if (log.error) errors.push(`Facebook Page: ${log.error}`);
        await prisma.platformCredential.update({ where: { platform: 'Facebook Page' }, data: { lastTested: new Date() } }).catch(() => {});
      }
    } else if (requestedPlatform === 'Facebook Ads') {
      const { token, adAccountId } = await getTokenForPlatform('Facebook Ads');
      if (!token) {
        errors.push('Facebook Ads: Chưa có token hợp lệ');
      } else {
        log = await syncFacebookAds(token, adAccountId, days);
        if (log.error) errors.push(`Facebook Ads: ${log.error}`);
        await prisma.platformCredential.update({ where: { platform: 'Facebook Ads' }, data: { lastTested: new Date() } }).catch(() => {});
      }
    } else if (requestedPlatform === 'Instagram') {
      const { token, igAccountId } = await getTokenForPlatform('Instagram');
      if (!token) {
        errors.push('Instagram: Chưa có token hợp lệ');
      } else {
        log = await syncInstagram(token, igAccountId, days);
        if (log.error) errors.push(`Instagram: ${log.error}`);
        await prisma.platformCredential.update({ where: { platform: 'Instagram' }, data: { lastTested: new Date() } }).catch(() => {});
      }
    }

    // Log automation
    if (log) {
      await prisma.automationLog.create({
        data: {
          level: log.error ? 'error' : 'info',
          source: `sync-meta-worker/${log.platform}`,
          message: log.error
            ? `Lỗi đồng bộ ${log.platform}: ${log.error}`
            : `Đồng bộ ${log.platform}: ${log.recordsFetched} lấy về, ${log.recordsSaved} đã lưu`,
          details: JSON.stringify(log),
        },
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(' | '), log }, { status: 400 });
    }

    return NextResponse.json({ success: true, log });

  } catch (error: any) {
    try {
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-meta-worker',
          message: `Lỗi worker: ${error?.message ?? 'Unknown'}`,
          details: JSON.stringify({ error: error?.message }),
        },
      });
    } catch { /* silent */ }
    return NextResponse.json({ success: false, error: error?.message ?? 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, event: any) {
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
    return verifySignatureEdge(handler)(req, event);
  }
  return handler(req);
}

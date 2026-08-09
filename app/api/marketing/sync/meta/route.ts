export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Vercel/Netlify if supported

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getTokenForPlatform, syncFacebookPage, syncFacebookAds, syncInstagram, SyncLog } from '@/lib/sync-meta-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Cho phép sync nếu có session HOẶC nếu hệ thống đã có credential kết nối sẵn trong DB
    if (!session) {
      const existingConn = await prisma.platformCredential.findFirst({
        where: { isConnected: true, platform: { in: ['Facebook Page', 'Facebook Ads', 'Instagram'] } }
      });
      if (!existingConn) {
        return NextResponse.json({ success: false, error: 'Chưa đăng nhập hoặc chưa cấu hình kết nối Meta/Instagram.' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const requestedPlatform = body?.platform; // Expected: 'Facebook Page', 'Facebook Ads', or 'Instagram'
    const days = body?.days;

    if (!requestedPlatform) {
      return NextResponse.json({ success: false, error: 'Thiếu tham số platform' }, { status: 400 });
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
          source: `sync-meta-route/${log.platform}`,
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

    const progressMessage = log?.progress
      ? log.progress.complete
        ? `Đã lấy đủ lịch sử: ${log.progress.saved} quảng cáo Instagram`
        : `Đã lấy ${log.progress.saved} quảng cáo Instagram, vẫn còn dữ liệu. Chạy lại để tiếp tục.`
      : `Đồng bộ ${requestedPlatform} thành công`;
    return NextResponse.json({ success: true, log, message: progressMessage });

  } catch (error: any) {
    try {
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-meta-route',
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

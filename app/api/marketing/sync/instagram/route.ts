export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy token từ DB (thử Instagram trước, fallback về Facebook Page)
    let credential = await prisma.platformCredential.findUnique({ where: { platform: 'Instagram' } });
    if (!credential || !credential.isConnected) {
      credential = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Page' } });
    }

    if (!credential || !credential.isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Instagram hoặc Facebook Page chưa được kết nối. Vui lòng nhập token và kiểm tra ở trang Kết Nối.',
      }, { status: 400 });
    }

    let token: string;
    let igAccountId: string | undefined;
    try {
      const decrypted = decrypt(credential.credentials);
      const parsed = JSON.parse(decrypted);
      if (parsed?.type !== 'live' || !parsed?.token) {
        return NextResponse.json({ success: false, error: 'Token Instagram không hợp lệ trong database.' }, { status: 400 });
      }
      token = parsed.token;
      igAccountId = parsed.igAccountId;
    } catch {
      return NextResponse.json({ success: false, error: 'Không thể giải mã token Instagram.' }, { status: 500 });
    }

    // Tìm IG Business Account nếu chưa có
    let igId = igAccountId;
    if (!igId) {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const pagesData = await pagesRes.json();
      if (pagesData.error) {
        await prisma.platformCredential.update({
          where: { platform: 'Instagram' },
          data: { isConnected: false },
        });
        return NextResponse.json({
          success: false,
          error: `Token lỗi: ${pagesData.error?.message || 'Không thể xác minh'}`,
        }, { status: 400 });
      }
      const page = (pagesData?.data || []).find((p: any) => p.instagram_business_account);
      if (!page) {
        return NextResponse.json({
          success: false,
          error: 'Không tìm thấy tài khoản Instagram Business. Kiểm tra quyền instagram_basic và pages_show_list.',
        }, { status: 400 });
      }
      igId = page.instagram_business_account.id;
    }

    // Lấy media gần nhất
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type,permalink&limit=25&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!mediaRes.ok) {
      const err = await mediaRes.json().catch(() => ({}));
      const errorMsg = err?.error?.message || `Instagram API lỗi: ${mediaRes.status}`;
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-instagram',
          message: `Lỗi đồng bộ Instagram: ${errorMsg}`,
          details: JSON.stringify(err),
        },
      });
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const mediaData = await mediaRes.json();
    const posts = mediaData?.data || [];
    let recordsFetched = posts.length;
    let recordsSaved = 0;

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
      recordsSaved++;
    }

    // Update lastTested
    await prisma.platformCredential.update({
      where: { platform: 'Instagram' },
      data: { lastTested: new Date() },
    }).catch(() => {});

    // Log tổng hợp
    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: 'sync-instagram',
        message: recordsSaved > 0
          ? `Đồng bộ Instagram: ${recordsFetched} lấy về, ${recordsSaved} đã lưu`
          : 'Đồng bộ Instagram: Đã kết nối nhưng chưa có bài đăng mới',
        details: JSON.stringify({ recordsFetched, recordsSaved }),
      },
    });

    return NextResponse.json({
      success: true,
      recordsFetched,
      recordsSaved,
      syncedAt: new Date().toISOString(),
      results: [{
        platform: 'Instagram',
        recordsFetched,
        recordsSaved,
        syncedAt: new Date().toISOString(),
      }],
      message: recordsSaved > 0
        ? `Đồng bộ Instagram: ${recordsFetched} lấy về, ${recordsSaved} đã lưu`
        : 'Đã kết nối nhưng chưa có bài đăng mới',
    });
  } catch (error: any) {
    try {
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-instagram',
          message: `Lỗi hệ thống: ${error?.message ?? 'Unknown'}`,
          details: JSON.stringify({ error: error?.message }),
        },
      });
    } catch { /* silent */ }
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Lỗi server khi đồng bộ Instagram' },
      { status: 500 }
    );
  }
}

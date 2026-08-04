export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const days = searchParams.get('days') || 'all';
    const sortBy = searchParams.get('sortBy') || 'newest';

    const hasIgModel = !!(prisma as any).instagramPost;
    let posts: any[] = [];

    if (hasIgModel) {
      const where: any = {};
      if (search) where.caption = { contains: search, mode: 'insensitive' };
      if (days !== 'all') {
        const numDays = parseInt(days, 10);
        if (!isNaN(numDays)) {
          const dateCutoff = new Date();
          dateCutoff.setDate(dateCutoff.getDate() - numDays);
          where.createdTime = { gte: dateCutoff };
        }
      }
      let orderBy: any = { createdTime: 'desc' };
      if (sortBy === 'likes') orderBy = { likesCount: 'desc' };
      if (sortBy === 'comments') orderBy = { commentsCount: 'desc' };
      if (sortBy === 'oldest') orderBy = { createdTime: 'asc' };

      posts = await (prisma as any).instagramPost.findMany({ where, orderBy, take: 100 });
    } else {
      // Fallback: Query ContentTracking với channel === 'Instagram'
      const trackingList = await prisma.contentTracking.findMany({
        where: { channel: 'Instagram' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      posts = trackingList.map((t: any) => ({
        id: t.id,
        postId: t.contentId?.replace(/^ig_/, '') || t.id,
        caption: t.aiSuggestion || '',
        mediaType: t.contentType || 'IMAGE',
        mediaUrl: t.adCost || '',
        permalinkUrl: t.orderId || `https://instagram.com`,
        createdTime: t.createdAt,
        likesCount: parseInt(t.saves || '0', 10) || 0,
        commentsCount: parseInt(t.comments || '0', 10) || 0,
        syncedAt: t.updatedAt || t.createdAt,
      }));

      // Lọc tay theo search
      if (search) {
        posts = posts.filter((p: any) => p.caption.toLowerCase().includes(search.toLowerCase()));
      }
    }

    const totalPosts = posts.length;
    const totalLikes = posts.reduce((acc: number, p: any) => acc + (p.likesCount || 0), 0);
    const totalComments = posts.reduce((acc: number, p: any) => acc + (p.commentsCount || 0), 0);

    return NextResponse.json({
      success: true,
      posts,
      summary: {
        totalPosts,
        totalLikes,
        totalComments,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 1. Tìm credential Instagram hoặc Facebook Page
    let credential = await prisma.platformCredential.findUnique({ where: { platform: 'Instagram' } });
    if (!credential || !credential.isConnected) {
      credential = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Page' } });
    }

    if (!credential || !credential.credentials) {
      return NextResponse.json({
        error: 'Chưa tìm thấy Token Instagram/Facebook hợp lệ. Vui lòng vào trang Kết Nối để dán Token.',
      }, { status: 400 });
    }

    let effectiveToken = '';
    let igAccountId = '';

    try {
      const decrypted = decrypt(credential.credentials);
      const parsed = JSON.parse(decrypted);
      if (parsed?.token || parsed?.userToken || parsed?.pageAccessToken) {
        effectiveToken = parsed.pageAccessToken || parsed.token || parsed.userToken;
        if (parsed.igAccountId) igAccountId = parsed.igAccountId;
      }
    } catch { /* silent */ }

    if (!effectiveToken) {
      return NextResponse.json({
        error: 'Token không hợp lệ trong Database. Vui lòng kiểm tra lại ở trang Kết Nối.',
      }, { status: 400 });
    }

    // 2. Nếu chưa có igAccountId, thử tìm từ /me/accounts
    if (!igAccountId) {
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(effectiveToken)}`);
        const pageData = await pageRes.json();
        const page = (pageData?.data || []).find((p: any) => p.instagram_business_account);
        if (page?.instagram_business_account?.id) {
          igAccountId = page.instagram_business_account.id;
        }
      } catch { /* silent */ }
    }

    if (!igAccountId) {
      return NextResponse.json({
        error: 'Không tìm thấy tài khoản Instagram Business. Vui lòng đảm bảo Fanpage đã liên kết Instagram Business hoặc dán Instagram Business ID ở trang Kết Nối.',
      }, { status: 400 });
    }

    // 3. Gọi Instagram Graph API lấy danh sách bài viết
    const fields = 'id,caption,timestamp,like_count,comments_count,media_type,permalink,media_url,thumbnail_url';
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(effectiveToken)}`
    );
    const igData = await igRes.json();

    if (igData.error) {
      return NextResponse.json({
        error: `Lỗi kết nối Instagram API: ${igData.error?.message || 'Token lỗi hoặc không đủ quyền'}`,
      }, { status: 400 });
    }

    const postsList = igData.data || [];
    let syncedCount = 0;
    const hasIgModel = !!(prisma as any).instagramPost;

    for (const post of postsList) {
      const postId = post.id;
      if (!postId) continue;

      const caption = post.caption || '';
      const mediaType = post.media_type || 'IMAGE';
      const mediaUrl = post.media_url || post.thumbnail_url || '';
      const permalinkUrl = post.permalink || `https://instagram.com/p/${postId}`;
      const createdTime = post.timestamp ? new Date(post.timestamp) : new Date();

      const likesCount = post.like_count ?? 0;
      const commentsCount = post.comments_count ?? 0;

      // Nếu model InstagramPost có sẵn trong Prisma Instance
      if (hasIgModel) {
        await (prisma as any).instagramPost.upsert({
          where: { postId },
          update: {
            igAccountId,
            caption,
            mediaType,
            mediaUrl,
            permalinkUrl,
            createdTime,
            likesCount,
            commentsCount,
            syncedAt: new Date(),
          },
          create: {
            postId,
            igAccountId,
            caption,
            mediaType,
            mediaUrl,
            permalinkUrl,
            createdTime,
            likesCount,
            commentsCount,
            syncedAt: new Date(),
          },
        });
      }

      // Cũng đồng bộ vào ContentTracking cho Analytics & Fallback
      const trackingId = `ig_${postId}`;
      const existingTracking = await prisma.contentTracking.findFirst({ where: { contentId: trackingId } });
      if (existingTracking) {
        await prisma.contentTracking.update({
          where: { id: existingTracking.id },
          data: {
            saves: String(likesCount),
            comments: String(commentsCount),
            aiSuggestion: caption,
            orderId: permalinkUrl,
            adCost: mediaUrl,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.contentTracking.create({
          data: {
            contentId: trackingId,
            channel: 'Instagram',
            contentType: mediaType,
            views: String(likesCount * 12 + 50),
            saves: String(likesCount),
            comments: String(commentsCount),
            shares: '0',
            aiSuggestion: caption,
            orderId: permalinkUrl,
            adCost: mediaUrl,
          },
        });
      }

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã đồng bộ thành công ${syncedCount} bài viết từ Instagram!`,
      syncedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server khi đồng bộ Instagram' }, { status: 500 });
  }
}

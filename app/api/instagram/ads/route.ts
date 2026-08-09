export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const days = searchParams.get('days') || 'all';
    const sortBy = searchParams.get('sortBy') || 'newest';

    const where: any = {};
    if (search) {
      where.OR = [
        { adName: { contains: search, mode: 'insensitive' } },
        { campaignName: { contains: search, mode: 'insensitive' } },
        { adSetName: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (days !== 'all') {
      const numDays = parseInt(days, 10);
      if (!isNaN(numDays)) {
        const syncedAfter = new Date();
        syncedAfter.setDate(syncedAfter.getDate() - numDays);
        where.syncedAt = { gte: syncedAfter };
      }
    }

    let orderBy: any = { syncedAt: 'desc' };
    if (sortBy === 'spend') orderBy = { spend: 'desc' };
    if (sortBy === 'reach') orderBy = { reach: 'desc' };
    if (sortBy === 'visits') orderBy = { visits: 'desc' };
    if (sortBy === 'oldest') orderBy = { syncedAt: 'asc' };

    const ads = await prisma.instagramAd.findMany({ where, orderBy, take: 500 });
    const posts = ads.map(ad => ({
      id: ad.id,
      adId: ad.adId,
      adName: ad.adName,
      campaignName: ad.campaignName,
      adSetName: ad.adSetName,
      postId: ad.postId || ad.adId,
      caption: ad.caption || ad.adName || '',
      mediaType: 'IMAGE',
      mediaUrl: ad.mediaUrl,
      permalinkUrl: ad.permalinkUrl,
      createdTime: ad.syncedAt,
      likesCount: ad.likesCount,
      commentsCount: ad.commentsCount,
      sharesCount: ad.sharesCount,
      engagementCount: ad.engagementCount,
      adSpend: ad.spend,
      adReach: ad.reach,
      adVisits: ad.visits,
      adStatus: ad.status,
      demographics: ad.demographics,
      syncedAt: ad.syncedAt,
    }));

    return NextResponse.json({
      success: true,
      posts,
      summary: {
        totalPosts: posts.length,
        totalLikes: posts.reduce((sum, post) => sum + post.likesCount, 0),
        totalComments: posts.reduce((sum, post) => sum + post.commentsCount, 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

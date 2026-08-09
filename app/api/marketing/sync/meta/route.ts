export const dynamic = 'force-dynamic';

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { assertQStashConfiguration, publishSyncJob } from '@/lib/qstash-sync';

const META_PLATFORMS = ['Facebook Page', 'Facebook Ads', 'Instagram'] as const;
type MetaPlatform = (typeof META_PLATFORMS)[number];

function normalizePlatforms(body: any): MetaPlatform[] {
  const requested = Array.isArray(body?.platforms) ? body.platforms : [body?.platform];
  const unique = Array.from(new Set(requested.filter(Boolean)));
  if (unique.length === 0 || unique.some(platform => !META_PLATFORMS.includes(platform as MetaPlatform))) {
    throw new Error('Platform không hợp lệ.');
  }
  return META_PLATFORMS.filter(platform => unique.includes(platform));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Bạn cần đăng nhập để bắt đầu đồng bộ.' }, { status: 401 });
    }

    assertQStashConfiguration();
    const body = await req.json().catch(() => ({}));
    const platforms = normalizePlatforms(body);
    const days = ['7', '30', '90', 'all'].includes(body?.days) ? body.days : '30';
    const groupId = randomUUID();

    const jobs = await prisma.$transaction(
      platforms.map((platform, sequence) => prisma.syncJob.create({
        data: { groupId, platform, days, sequence },
      }))
    );

    try {
      const firstJob = jobs[0];
      const messageId = await publishSyncJob({ jobId: firstJob.id, revision: firstJob.revision });
      await prisma.syncJob.update({ where: { id: firstJob.id }, data: { messageId } });
    } catch (error: any) {
      await prisma.syncJob.updateMany({
        where: { groupId },
        data: { status: 'FAILED', error: error?.message || 'Không thể publish QStash', completedAt: new Date() },
      });
      throw error;
    }

    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: 'sync-meta-dispatcher',
        message: `Đã xếp hàng đồng bộ: ${platforms.join(' → ')}`,
        details: JSON.stringify({ groupId, jobIds: jobs.map(job => job.id), platforms, days }),
      },
    });

    return NextResponse.json({
      success: true,
      status: 'QUEUED',
      groupId,
      jobIds: jobs.map(job => job.id),
      message: `Đã xếp hàng ${platforms.length} tác vụ đồng bộ.`,
    }, { status: 202 });
  } catch (error: any) {
    const message = error?.message || 'Lỗi server khi xếp hàng đồng bộ Meta.';
    const status = message.includes('QSTASH_') || message.includes('NEXT_PUBLIC_APP_URL') ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

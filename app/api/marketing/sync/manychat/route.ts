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

    // Kiểm tra kết nối
    const credential = await prisma.platformCredential.findUnique({ where: { platform: 'ManyChat' } });
    if (!credential || !credential.isConnected) {
      return NextResponse.json({
        success: false,
        error: 'ManyChat chưa được kết nối. Vui lòng nhập API Key và kiểm tra trước.',
      }, { status: 400 });
    }

    let token: string;
    try {
      const decrypted = decrypt(credential.credentials);
      const parsed = JSON.parse(decrypted);
      if (parsed?.type !== 'live' || !parsed?.token) {
        return NextResponse.json({ success: false, error: 'Token ManyChat không hợp lệ trong database.' }, { status: 400 });
      }
      token = parsed.token;
    } catch {
      return NextResponse.json({ success: false, error: 'Không thể giải mã token ManyChat.' }, { status: 500 });
    }

    // Verify token với ManyChat API
    const verifyRes = await fetch('https://api.manychat.com/fb/page/getInfo', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData?.status !== 'success') {
      const errorMsg = verifyData?.message || verifyData?.error || `ManyChat API lỗi: ${verifyRes.status}`;
      await prisma.platformCredential.update({
        where: { platform: 'ManyChat' },
        data: { isConnected: false },
      });
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-manychat',
          message: `ManyChat token lỗi: ${errorMsg}`,
          details: JSON.stringify(verifyData),
        },
      });
      return NextResponse.json({ success: false, error: `Token không hợp lệ: ${errorMsg}` }, { status: 400 });
    }

    // Lấy subscribers gần đây
    let recordsFetched = 0;
    let recordsSaved = 0;

    try {
      const subsRes = await fetch('https://api.manychat.com/fb/subscriber/getSubscribers?limit=25', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });
      const subsData = await subsRes.json();

      if (subsData?.status === 'success' && Array.isArray(subsData?.data?.data)) {
        const subscribers = subsData.data.data;
        recordsFetched = subscribers.length;

        for (const sub of subscribers) {
          const subId = `mc_${sub.id}`;
          const existing = await prisma.automationLog.findFirst({
            where: { source: 'sync-manychat', message: { contains: subId } },
          });

          if (!existing) {
            await prisma.automationLog.create({
              data: {
                level: 'info',
                source: 'sync-manychat',
                message: `[${subId}] ${sub.first_name || ''} ${sub.last_name || ''} - ${sub.status || 'active'}`,
                details: JSON.stringify({
                  subscriberId: sub.id,
                  name: `${sub.first_name || ''} ${sub.last_name || ''}`.trim(),
                  status: sub.status,
                  subscribed: sub.subscribed,
                }),
              },
            });
            recordsSaved++;
          }
        }
      }
    } catch (subErr: any) {
      // Subscriber API có thể bị giới hạn, vẫn tiếp tục
      await prisma.automationLog.create({
        data: {
          level: 'warn',
          source: 'sync-manychat',
          message: `ManyChat subscribers API lỗi: ${subErr?.message || 'Unknown'}`,
          details: JSON.stringify({ error: subErr?.message }),
        },
      });
    }

    // Update lastTested
    await prisma.platformCredential.update({
      where: { platform: 'ManyChat' },
      data: { lastTested: new Date() },
    }).catch(() => {});

    // Log tổng hợp
    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: 'sync-manychat',
        message: recordsSaved > 0
          ? `Đồng bộ ManyChat: ${recordsFetched} lấy về, ${recordsSaved} đã lưu`
          : 'Đồng bộ ManyChat: Đã kết nối nhưng chưa có dữ liệu mới',
        details: JSON.stringify({
          page: verifyData?.data?.name || 'Unknown',
          recordsFetched,
          recordsSaved,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      recordsFetched,
      recordsSaved,
      syncedAt: new Date().toISOString(),
      results: [{
        platform: 'ManyChat',
        recordsFetched,
        recordsSaved,
        syncedAt: new Date().toISOString(),
      }],
      message: recordsSaved > 0
        ? `Đồng bộ ManyChat: ${recordsFetched} lấy về, ${recordsSaved} đã lưu`
        : 'Đã kết nối nhưng chưa có dữ liệu mới',
    });
  } catch (error: any) {
    try {
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-manychat',
          message: `Lỗi hệ thống: ${error?.message ?? 'Unknown'}`,
          details: JSON.stringify({ error: error?.message }),
        },
      });
    } catch { /* silent */ }
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Lỗi server khi đồng bộ ManyChat' },
      { status: 500 }
    );
  }
}

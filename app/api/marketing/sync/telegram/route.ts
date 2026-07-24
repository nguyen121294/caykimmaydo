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

    // Lấy token từ DB
    const credential = await prisma.platformCredential.findUnique({ where: { platform: 'Telegram' } });
    if (!credential || !credential.isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Telegram chưa được kết nối. Vui lòng nhập Bot Token và kiểm tra trước.',
      }, { status: 400 });
    }

    let token: string;
    try {
      const decrypted = decrypt(credential.credentials);
      const parsed = JSON.parse(decrypted);
      if (parsed?.type !== 'live' || !parsed?.token) {
        return NextResponse.json({ success: false, error: 'Token Telegram không hợp lệ trong database.' }, { status: 400 });
      }
      token = parsed.token;
    } catch {
      return NextResponse.json({ success: false, error: 'Không thể giải mã token Telegram.' }, { status: 500 });
    }

    // Verify bot
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(15000) });
    const meData = await meRes.json();
    if (!meData.ok) {
      // Token hết hạn hoặc bị revoke
      await prisma.platformCredential.update({
        where: { platform: 'Telegram' },
        data: { isConnected: false },
      });
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-telegram',
          message: `Bot token không hợp lệ: ${meData.description || 'Unknown error'}`,
          details: JSON.stringify(meData),
        },
      });
      return NextResponse.json({
        success: false,
        error: `Bot token lỗi: ${meData.description || 'Không thể xác minh bot'}`,
      }, { status: 400 });
    }

    const botInfo = meData.result;

    // Lấy updates
    const updatesRes = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=50&allowed_updates=["message","channel_post"]`,
      { signal: AbortSignal.timeout(15000) }
    );
    const updatesData = await updatesRes.json();

    let recordsFetched = 0;
    let recordsSaved = 0;

    if (updatesData.ok && Array.isArray(updatesData.result)) {
      const updates = updatesData.result;
      recordsFetched = updates.length;

      for (const update of updates) {
        const msg = update.message || update.channel_post;
        if (!msg) continue;

        const chatId = msg.chat?.id;
        const chatTitle = msg.chat?.title || msg.chat?.first_name || `Chat ${chatId}`;
        const text = msg.text || msg.caption || '';
        const fromUser = msg.from?.first_name || msg.from?.username || 'Unknown';
        const msgDate = msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString();

        const logId = `tg_update_${update.update_id}`;

        // Kiểm tra đã tồn tại chưa (tránh duplicate)
        const existing = await prisma.automationLog.findFirst({
          where: { source: 'sync-telegram', message: { contains: logId } },
        });

        if (!existing) {
          await prisma.automationLog.create({
            data: {
              level: 'info',
              source: 'sync-telegram',
              message: `[${logId}] ${chatTitle}: ${text.slice(0, 200)}`,
              details: JSON.stringify({
                updateId: update.update_id,
                chatId,
                chatTitle,
                from: fromUser,
                text: text.slice(0, 500),
                date: msgDate,
              }),
            },
          });
          recordsSaved++;
        }
      }
    }

    // Update lastTested
    await prisma.platformCredential.update({
      where: { platform: 'Telegram' },
      data: { lastTested: new Date() },
    }).catch(() => {});

    // Log tổng hợp
    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: 'sync-telegram',
        message: recordsSaved > 0
          ? `Đồng bộ Telegram: ${recordsFetched} lấy về, ${recordsSaved} đã lưu`
          : 'Đồng bộ Telegram: Đã kết nối nhưng chưa có tin nhắn mới',
        details: JSON.stringify({
          bot: botInfo?.username,
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
      bot: {
        username: botInfo?.username,
        firstName: botInfo?.first_name,
      },
      results: [{
        platform: 'Telegram',
        recordsFetched,
        recordsSaved,
        syncedAt: new Date().toISOString(),
      }],
      message: recordsSaved > 0
        ? `Đồng bộ Telegram: ${recordsFetched} lấy về, ${recordsSaved} đã lưu`
        : 'Đã kết nối nhưng chưa có tin nhắn mới',
    });
  } catch (error: any) {
    try {
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: 'sync-telegram',
          message: `Lỗi hệ thống: ${error?.message ?? 'Unknown'}`,
          details: JSON.stringify({ error: error?.message }),
        },
      });
    } catch { /* silent */ }
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Lỗi server khi đồng bộ Telegram' },
      { status: 500 }
    );
  }
}

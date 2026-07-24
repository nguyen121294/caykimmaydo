export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

/**
 * POST /api/connections/sync
 * 
 * Đồng bộ dữ liệu thật từ nền tảng bên ngoài.
 * Yêu cầu token thật. KHÔNG dùng mock/fake data.
 * 
 * Cho các platform không phải Meta (Zalo, ManyChat, Google Sheets, Telegram...),
 * chỉ ghi log và trả về thông báo chưa hỗ trợ API thật.
 * Facebook Page / Ads được xử lý bởi /api/marketing/sync/meta.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform } = body ?? {};

    if (!platform) {
      return NextResponse.json({ error: 'Thiếu tên nền tảng' }, { status: 400 });
    }

    // Facebook Page / Ads -> chuyển sang /api/marketing/sync/meta
    if (platform === 'Facebook Page' || platform === 'Facebook Ads') {
      return NextResponse.json({
        error: `Vui lòng sử dụng nút "Đồng bộ dữ liệu" hoặc API /api/marketing/sync/meta cho ${platform}`,
      }, { status: 400 });
    }

    // Kiểm tra kết nối
    const credential = await prisma.platformCredential.findUnique({ where: { platform } });
    if (!credential || !credential.isConnected) {
      return NextResponse.json({ error: `${platform} chưa được kết nối. Vui lòng nhập token và kiểm tra kết nối trước.` }, { status: 400 });
    }

    // Kiểm tra có token thật không
    let hasRealToken = false;
    try {
      const decrypted = decrypt(credential.credentials);
      const parsed = JSON.parse(decrypted);
      hasRealToken = parsed?.type === 'live' && !!parsed?.token;
    } catch { /* */ }

    if (!hasRealToken) {
      return NextResponse.json({
        error: `${platform}: Chưa có token thật. Vui lòng nhập token API và kiểm tra kết nối.`,
      }, { status: 400 });
    }

    // Các platform khác chưa có API thật
    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: `sync/${platform}`,
        message: `${platform}: Đã kết nối, chưa hỗ trợ đồng bộ tự động. Vui lòng nhập dữ liệu thủ công.`,
        details: JSON.stringify({ platform, status: 'api_not_supported' }),
      },
    });

    return NextResponse.json({
      platform,
      recordsFetched: 0,
      recordsSaved: 0,
      saved_count: 0,
      syncedAt: new Date().toISOString(),
      message: `${platform}: Đã kết nối nhưng API đồng bộ tự động chưa được hỗ trợ cho nền tảng này.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi server' }, { status: 500 });
  }
}

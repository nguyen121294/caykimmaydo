export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

function isMetaPlatform(platform: string): boolean {
  const lower = platform.toLowerCase().replace(/\s+/g, '_');
  return lower.includes('facebook') || lower.includes('instagram');
}

function isTelegramPlatform(platform: string): boolean {
  return platform.toLowerCase().includes('telegram');
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === 'admin';

    const credentials = await prisma.platformCredential.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const result = (credentials ?? []).map((c: any) => {
      let mode = 'disconnected';
      let adAccountId = '';
      let pageId = '';
      let pageName = '';
      let adAccountName = '';
      let tokenError = '';
      let hasToken = false;
      let needsVerification = false;
      try {
        const decrypted = decrypt(JSON.stringify(c.credentials) !== '""' ? c.credentials : '');
        const parsed = JSON.parse(decrypted);
        mode = parsed?.type === 'live' ? 'live' : 'disconnected';
        adAccountId = parsed?.adAccountId || '';
        pageId = parsed?.pageId || '';
        pageName = parsed?.pageName || '';
        adAccountName = parsed?.adAccountName || '';
        tokenError = parsed?.tokenError || '';
        hasToken = !!(parsed?.token || parsed?.userToken);
        needsVerification = !!parsed?.needsVerification;
      } catch { /* fallback */ }
      return {
        id: c.id,
        platform: c.platform,
        isConnected: c.isConnected ?? false,
        lastTested: c.lastTested ? c.lastTested.toISOString() : null,
        mode,
        adAccountId,
        pageId,
        pageName,
        adAccountName,
        tokenError,
        hasToken,
        needsVerification,
      };
    });
    return NextResponse.json({ connections: result, isAdmin });
  } catch (error: any) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    const body = await req.json();
    const { platform, action, token, adAccountId } = body ?? {};

    if (!platform) {
      return NextResponse.json({ error: 'Thiếu tên nền tảng' }, { status: 400 });
    }

    if (action === 'test' || action === 'disconnect') {
      if (userRole !== 'admin') {
        return NextResponse.json({ error: 'Chỉ Admin mới có quyền thao tác kết nối' }, { status: 403 });
      }
    }


    // Disconnect
    if (action === 'disconnect') {
      await prisma.platformCredential.updateMany({
        where: { platform },
        data: { isConnected: false },
      });
      await prisma.automationLog.create({
        data: {
          level: 'info',
          source: 'connections',
          message: `Ngắt kết nối ${platform}`,
          details: JSON.stringify({ platform, action: 'disconnect' }),
        },
      });
      return NextResponse.json({ success: true, message: `Đã ngắt kết nối ${platform}` });
    }

    // Test connection - chỉ hỗ trợ live mode với token thật
    if (action === 'test') {
      let effectiveToken = token;
      let storedAdAccountId = adAccountId;

      // Nếu không có token mới, thử dùng token đã lưu trong DB
      if (!effectiveToken) {
        try {
          const existing = await prisma.platformCredential.findUnique({ where: { platform } });
          if (existing?.credentials) {
            const decrypted = decrypt(existing.credentials);
            const parsed = JSON.parse(decrypted);
            if (parsed?.type === 'live' && parsed?.token) {
              effectiveToken = parsed.token;
              if (!storedAdAccountId && parsed?.adAccountId) {
                storedAdAccountId = parsed.adAccountId;
              }
            }
          }
        } catch { /* ignore decryption errors */ }
      }

      if (!effectiveToken) {
        return NextResponse.json({ error: 'Vui lòng nhập API Token/Key để kết nối' }, { status: 400 });
      }

      const credentialData: any = { type: 'live', token: effectiveToken };
      if (storedAdAccountId) {
        credentialData.adAccountId = storedAdAccountId;
      }

      // === Telegram Bot API verification ===
      if (isTelegramPlatform(platform)) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${effectiveToken}/getMe`, { signal: AbortSignal.timeout(15000) });
          const tgData = await tgRes.json();
          if (!tgData.ok) {
            const errorMsg = tgData.description || 'Token bot không hợp lệ';
            credentialData.tokenError = errorMsg;
            const encrypted = encrypt(JSON.stringify(credentialData));
            await prisma.platformCredential.upsert({
              where: { platform },
              update: { credentials: encrypted, isConnected: false, lastTested: new Date() },
              create: { platform, credentials: encrypted, isConnected: false, lastTested: new Date() },
            });
            await prisma.automationLog.create({
              data: {
                level: 'error',
                source: 'connections',
                message: `Telegram token lỗi: ${errorMsg}`,
                details: JSON.stringify({ platform, error: tgData }),
              },
            });
            return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
          }

          // Bot hợp lệ - lưu thêm info
          credentialData.botUsername = tgData.result?.username;
          credentialData.botName = tgData.result?.first_name;
        } catch (fetchErr: any) {
          return NextResponse.json({
            success: false,
            error: `Không thể kết nối Telegram API: ${fetchErr?.message || 'Network error'}`,
          }, { status: 500 });
        }
      }

      // === ManyChat API verification ===
      if (platform.toLowerCase().includes('manychat')) {
        try {
          const mcRes = await fetch('https://api.manychat.com/fb/page/getInfo', {
            headers: {
              'Authorization': `Bearer ${effectiveToken}`,
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15000),
          });
          const mcData = await mcRes.json();
          if (!mcRes.ok || mcData?.status !== 'success') {
            const errorMsg = mcData?.message || mcData?.error || `ManyChat API lỗi: ${mcRes.status}`;
            credentialData.tokenError = errorMsg;
            const encrypted = encrypt(JSON.stringify(credentialData));
            await prisma.platformCredential.upsert({
              where: { platform },
              update: { credentials: encrypted, isConnected: false, lastTested: new Date() },
              create: { platform, credentials: encrypted, isConnected: false, lastTested: new Date() },
            });
            await prisma.automationLog.create({
              data: {
                level: 'error',
                source: 'connections',
                message: `ManyChat token lỗi: ${errorMsg}`,
                details: JSON.stringify({ platform, error: mcData }),
              },
            });
            return NextResponse.json({ success: false, error: `Token không hợp lệ: ${errorMsg}` }, { status: 400 });
          }
          credentialData.pageName = mcData?.data?.name;
        } catch (fetchErr: any) {
          return NextResponse.json({
            success: false,
            error: `Không thể kết nối ManyChat API: ${fetchErr?.message || 'Network error'}`,
          }, { status: 500 });
        }
      }

      // === Meta API verification (Facebook/Instagram) ===
      if (isMetaPlatform(platform)) {
        try {
          const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(effectiveToken)}`);
          const meData = await meRes.json();
          if (meData.error) {
            const errorMsg = meData.error?.message || 'Lỗi xác thực';
            const errorCode = meData.error?.code;
            const errorSubcode = meData.error?.error_subcode;
            
            let userError = `Token không hợp lệ: ${errorMsg}`;
            if (errorCode === 190) {
              userError = errorSubcode === 463 
                ? 'Token đã hết hạn. Vui lòng tạo token mới.' 
                : `Token không hợp lệ: ${errorMsg}`;
            } else if (errorCode === 10 || errorCode === 200) {
              userError = `Thiếu quyền truy cập: ${errorMsg}`;
            }

            // Lưu lỗi vào credential
            credentialData.tokenError = userError;
            const encrypted = encrypt(JSON.stringify(credentialData));
            await prisma.platformCredential.upsert({
              where: { platform },
              update: { credentials: encrypted, isConnected: false, lastTested: new Date() },
              create: { platform, credentials: encrypted, isConnected: false, lastTested: new Date() },
            });

            await prisma.automationLog.create({
              data: {
                level: 'error',
                source: 'connections',
                message: `Token không hợp lệ: ${platform} - ${errorMsg}`,
                details: JSON.stringify({ platform, error: meData.error }),
              },
            });
            return NextResponse.json({ success: false, error: userError }, { status: 400 });
          }

          // Facebook Ads: kiểm tra thêm adAccountId
          const lower = platform.toLowerCase();
          if (lower.includes('ads') && storedAdAccountId) {
            const cleanId = storedAdAccountId.replace('act_', '');
            const adRes = await fetch(
              `https://graph.facebook.com/v19.0/act_${cleanId}?access_token=${encodeURIComponent(effectiveToken)}&fields=name,account_status`
            );
            const adData = await adRes.json();
            if (adData.error) {
              const adError = `Ad Account ID không hợp lệ: ${adData.error?.message || 'Không tìm thấy'}`;
              credentialData.tokenError = adError;
              const encrypted = encrypt(JSON.stringify(credentialData));
              await prisma.platformCredential.upsert({
                where: { platform },
                update: { credentials: encrypted, isConnected: false, lastTested: new Date() },
                create: { platform, credentials: encrypted, isConnected: false, lastTested: new Date() },
              });
              await prisma.automationLog.create({
                data: {
                  level: 'error',
                  source: 'connections',
                  message: `Ad Account lỗi: ${platform} - ${adData.error?.message}`,
                  details: JSON.stringify({ platform, adAccountId: storedAdAccountId, error: adData.error }),
                },
              });
              return NextResponse.json({ success: false, error: adError }, { status: 400 });
            }
          }

          // Instagram: kiểm tra pages và instagram_business_account
          if (lower.includes('instagram')) {
            const igRes = await fetch(
              `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(effectiveToken)}`
            );
            const igData = await igRes.json();
            const igAccount = (igData?.data || []).find((p: any) => p.instagram_business_account);
            if (!igAccount) {
              const igError = 'Không tìm thấy tài khoản Instagram Business. Kiểm tra token có quyền instagram_basic và pages_show_list.';
              credentialData.tokenError = igError;
              const encrypted = encrypt(JSON.stringify(credentialData));
              await prisma.platformCredential.upsert({
                where: { platform },
                update: { credentials: encrypted, isConnected: false, lastTested: new Date() },
                create: { platform, credentials: encrypted, isConnected: false, lastTested: new Date() },
              });
              return NextResponse.json({ success: false, error: igError }, { status: 400 });
            }
            credentialData.igAccountId = igAccount.instagram_business_account?.id;
          }
        } catch (fetchErr: any) {
          return NextResponse.json({
            success: false,
            error: `Không thể kết nối Meta API: ${fetchErr?.message || 'Network error'}`,
          }, { status: 500 });
        }
      }

      // Token hợp lệ - lưu và đánh dấu đã kết nối
      delete credentialData.tokenError;
      delete credentialData.needsVerification;
      const encrypted = encrypt(JSON.stringify(credentialData));
      await prisma.platformCredential.upsert({
        where: { platform },
        update: { credentials: encrypted, isConnected: true, lastTested: new Date() },
        create: { platform, credentials: encrypted, isConnected: true, lastTested: new Date() },
      });
      await prisma.automationLog.create({
        data: {
          level: 'info',
          source: 'connections',
          message: `Kết nối API thành công: ${platform}`,
          details: JSON.stringify({ platform, mode: 'live', hasAdAccountId: !!storedAdAccountId }),
        },
      });
      return NextResponse.json({ success: true, mode: 'live', platform });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi server' }, { status: 500 });
  }
}

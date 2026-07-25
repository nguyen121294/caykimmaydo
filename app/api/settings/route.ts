export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === 'admin';
    
    const credentials = await prisma.platformCredential.findMany();
    const settings = await prisma.appSetting.findMany();
    
    // Extract Meta App credentials if configured in DB or fallback to env
    const metaAppCred = credentials.find(c => c.platform === 'Meta App Credentials');
    let metaClientId = process.env.FACEBOOK_CLIENT_ID || '';
    let hasMetaClientSecret = !!process.env.FACEBOOK_CLIENT_SECRET;

    if (metaAppCred?.credentials) {
      try {
        const decrypted = decrypt(metaAppCred.credentials);
        const parsed = JSON.parse(decrypted);
        if (parsed?.clientId) metaClientId = parsed.clientId;
        if (parsed?.clientSecret) hasMetaClientSecret = true;
      } catch {}
    }

    // Mask credentials for display
    const masked = (credentials ?? [])?.map?.((c: any) => ({
      ...(c ?? {}),
      credentials: c?.isConnected ? '***configured***' : '',
    })) ?? [];

    return NextResponse.json({
      credentials: masked,
      settings: settings ?? [],
      isAdmin,
      metaApp: {
        clientId: metaClientId,
        hasClientSecret: hasMetaClientSecret,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền thay đổi cài đặt' }, { status: 403 });
    }

    const body = await req.json();
    const { platform, credentials } = body ?? {};
    if (!platform || !credentials) {
      return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 });
    }

    // Special handling for Meta App Credentials
    if (platform === 'Meta App Credentials') {
      const { clientId, clientSecret } = credentials;
      let existingSecret = '';
      
      try {
        const existing = await prisma.platformCredential.findUnique({ where: { platform: 'Meta App Credentials' } });
        if (existing?.credentials) {
          const decrypted = decrypt(existing.credentials);
          const parsed = JSON.parse(decrypted);
          if (parsed?.clientSecret) existingSecret = parsed.clientSecret;
        }
      } catch {}

      const newSecret = clientSecret ? clientSecret.trim() : existingSecret;
      const newClientId = clientId ? clientId.trim() : '';

      const credentialData = {
        type: 'live',
        clientId: newClientId,
        clientSecret: newSecret,
      };

      const encrypted = encrypt(JSON.stringify(credentialData));
      await prisma.platformCredential.upsert({
        where: { platform: 'Meta App Credentials' },
        update: { credentials: encrypted, isConnected: !!(newClientId && newSecret), lastTested: new Date() },
        create: { platform: 'Meta App Credentials', credentials: encrypted, isConnected: !!(newClientId && newSecret), lastTested: new Date() },
      });

      return NextResponse.json({
        success: true,
        platform,
        message: 'Đã lưu cấu hình Meta App thành công!',
      });
    }

    // Wrap credentials with type: 'live' format expected by connections API
    const credentialData: Record<string, any> = { type: 'live' };
    if (credentials.token) credentialData.token = credentials.token;
    else if (credentials.access_token) credentialData.token = credentials.access_token;
    else if (credentials.api_key) credentialData.token = credentials.api_key;
    else if (credentials.bot_token) credentialData.token = credentials.bot_token;
    else {
      const vals = Object.values(credentials).filter((v: any) => typeof v === 'string' && v.length > 10);
      if (vals.length > 0) credentialData.token = vals[0];
    }
    if (credentials.ad_account_id) credentialData.adAccountId = credentials.ad_account_id;
    if (credentials.adAccountId) credentialData.adAccountId = credentials.adAccountId;

    credentialData.needsVerification = true;
    const encrypted = encrypt(JSON.stringify(credentialData));
    const result = await prisma.platformCredential.upsert({
      where: { platform },
      update: { credentials: encrypted, isConnected: false, lastTested: new Date() },
      create: { platform, credentials: encrypted, isConnected: false, lastTested: new Date() },
    });

    return NextResponse.json({
      success: true,
      platform: result?.platform,
      message: 'Token đã lưu. Vui lòng vào trang Kết Nối Nền Tảng để kiểm tra và xác minh kết nối.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET() {
  try {
    const credentials = await prisma.platformCredential.findMany();
    const settings = await prisma.appSetting.findMany();
    
    // Mask credentials for display
    const masked = (credentials ?? [])?.map?.((c: any) => ({
      ...(c ?? {}),
      credentials: c?.isConnected ? '***configured***' : '',
    })) ?? [];

    return NextResponse.json({ credentials: masked, settings: settings ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, credentials } = body ?? {};
    if (!platform || !credentials) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Wrap credentials with type: 'live' format expected by connections API
    const credentialData: Record<string, any> = { type: 'live' };
    // Map common field names to token
    if (credentials.token) credentialData.token = credentials.token;
    else if (credentials.access_token) credentialData.token = credentials.access_token;
    else if (credentials.api_key) credentialData.token = credentials.api_key;
    else if (credentials.bot_token) credentialData.token = credentials.bot_token;
    else {
      // Store all fields but try to find a token-like value
      const vals = Object.values(credentials).filter((v: any) => typeof v === 'string' && v.length > 10);
      if (vals.length > 0) credentialData.token = vals[0];
    }
    // Preserve extra fields like adAccountId
    if (credentials.ad_account_id) credentialData.adAccountId = credentials.ad_account_id;
    if (credentials.adAccountId) credentialData.adAccountId = credentials.adAccountId;

    // CRITICAL: Do NOT mark isConnected=true. Token must be verified on Connections page.
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

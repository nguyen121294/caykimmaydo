import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', request.url));
  }

  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(new URL('/settings?error=missing_credentials', request.url));
  }

  try {
    const params = new URLSearchParams();
    params.append('app_id', appId);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);

    const tokenRes = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'secret_key': appSecret,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_name || 'Failed to get Zalo access token');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = parseInt(tokenData.expires_in || '0');
    
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await prisma.platformCredential.upsert({
      where: { platform: 'Zalo' },
      update: {
        credentials: encrypt(JSON.stringify({ type: 'live', token: accessToken, refreshToken, expiresAt })),
        isConnected: true,
        lastTested: new Date(),
      },
      create: {
        platform: 'Zalo',
        credentials: encrypt(JSON.stringify({ type: 'live', token: accessToken, refreshToken, expiresAt })),
        isConnected: true,
        lastTested: new Date(),
      },
    });

    return NextResponse.redirect(new URL('/connections?oauth_success=zalo', request.url));
  } catch (error: any) {
    console.error('Zalo OAuth Error:', error);
    return NextResponse.redirect(new URL(`/connections?oauth_error=${encodeURIComponent(error.message)}`, request.url));
  }
}

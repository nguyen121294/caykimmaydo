import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function GET(request: Request) {
  let clientId = process.env.FACEBOOK_CLIENT_ID;

  try {
    const dbMetaApp = await prisma.platformCredential.findUnique({
      where: { platform: 'Meta App Credentials' },
    });
    if (dbMetaApp?.credentials) {
      const decrypted = decrypt(dbMetaApp.credentials);
      const parsed = JSON.parse(decrypted);
      if (parsed?.clientId) {
        clientId = parsed.clientId;
      }
    }
  } catch {}

  const host = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const dynamicBaseUrl = `${proto}://${host}`;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || dynamicBaseUrl).replace(/\/+$/, '');
  const redirectUri = `${baseUrl}/api/oauth/facebook/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'FACEBOOK_CLIENT_ID chưa được cấu hình. Vui lòng vào Cài Đặt để nhập App ID.' }, { status: 500 });
  }

  const scopes = [
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
    'pages_read_user_content',
    'pages_messaging',
    'pages_show_list',
    'ads_read',
    'read_insights',
    'instagram_basic'
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(authUrl);
}


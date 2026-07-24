import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.ZALO_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/oauth/zalo/callback`;

  if (!appId) {
    return NextResponse.json({ error: 'ZALO_APP_ID is not configured' }, { status: 500 });
  }

  // Generate a random state string for security
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(authUrl);
}

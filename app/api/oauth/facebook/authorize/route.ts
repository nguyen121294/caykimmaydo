import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/oauth/facebook/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'FACEBOOK_CLIENT_ID is not configured' }, { status: 500 });
  }

  const scopes = [
    'pages_read_engagement',
    'pages_manage_posts',
    'ads_read',
    'read_insights',
    'instagram_basic',
    'pages_show_list'
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(authUrl);
}

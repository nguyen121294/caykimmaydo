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

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/oauth/facebook/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?error=missing_credentials', request.url));
  }

  try {
    // 1. Exchange code for short-lived user access token
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || 'Failed to get access token');
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for long-lived token
    const longLivedRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`);
    const longLivedData = await longLivedRes.json();
    
    if (longLivedData.error) {
      throw new Error(longLivedData.error.message || 'Failed to get long-lived token');
    }

    const userAccessToken = longLivedData.access_token;

    // 3. Get User's Pages (to get Page Access Token)
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
    const pagesData = await pagesRes.json();
    
    const firstPage = pagesData.data?.[0];
    let pageAccessToken = null;
    let pageId = null;

    if (firstPage) {
      pageAccessToken = firstPage.access_token;
      pageId = firstPage.id;
      
      await prisma.platformCredential.upsert({
        where: { platform: 'Facebook Page' },
        update: {
          credentials: encrypt(JSON.stringify({ type: 'live', token: pageAccessToken, pageId })),
          isConnected: true,
          lastTested: new Date(),
        },
        create: {
          platform: 'Facebook Page',
          credentials: encrypt(JSON.stringify({ type: 'live', token: pageAccessToken, pageId })),
          isConnected: true,
          lastTested: new Date(),
        },
      });
    }

    // 4. Get Ad Accounts
    const adAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${userAccessToken}`);
    const adAccountsData = await adAccountsRes.json();
    
    const firstAdAccount = adAccountsData.data?.[0];
    if (firstAdAccount) {
      const adAccountId = firstAdAccount.id.replace('act_', ''); // store without act_ or with it, based on what user expects. The sync script handles it.
      
      await prisma.platformCredential.upsert({
        where: { platform: 'Facebook Ads' },
        update: {
          credentials: encrypt(JSON.stringify({ type: 'live', token: userAccessToken, adAccountId })),
          isConnected: true,
          lastTested: new Date(),
        },
        create: {
          platform: 'Facebook Ads',
          credentials: encrypt(JSON.stringify({ type: 'live', token: userAccessToken, adAccountId })),
          isConnected: true,
          lastTested: new Date(),
        },
      });
    }

    // 5. Get Instagram Business Accounts
    const igRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${userAccessToken}`);
    const igData = await igRes.json();
    
    const firstIgPage = igData.data?.find((p: any) => p.instagram_business_account);
    if (firstIgPage) {
      const igAccountId = firstIgPage.instagram_business_account.id;
      
      await prisma.platformCredential.upsert({
        where: { platform: 'Instagram' },
        update: {
          credentials: encrypt(JSON.stringify({ type: 'live', token: userAccessToken, igAccountId })),
          isConnected: true,
          lastTested: new Date(),
        },
        create: {
          platform: 'Instagram',
          credentials: encrypt(JSON.stringify({ type: 'live', token: userAccessToken, igAccountId })),
          isConnected: true,
          lastTested: new Date(),
        },
      });
    }

    return NextResponse.redirect(new URL('/settings?oauth_success=facebook', request.url));
  } catch (error: any) {
    console.error('Facebook OAuth Error:', error);
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error.message)}`, request.url));
  }
}

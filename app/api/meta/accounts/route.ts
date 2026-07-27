export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy token từ Facebook Page hoặc Facebook Ads credential
    const pageCred = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Page' } });
    const adsCred = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Ads' } });

    let userAccessToken: string | null = null;
    let selectedPageId: string | null = null;
    let selectedAdAccountId: string | null = null;

    if (pageCred?.credentials) {
      try {
        const parsed = JSON.parse(decrypt(pageCred.credentials));
        userAccessToken = parsed.userToken || parsed.token || null;
        selectedPageId = parsed.pageId || null;
      } catch {}
    }

    if (adsCred?.credentials) {
      try {
        const parsed = JSON.parse(decrypt(adsCred.credentials));
        if (!userAccessToken) userAccessToken = parsed.userToken || parsed.token || null;
        selectedAdAccountId = parsed.adAccountId || null;
      } catch {}
    }

    if (!userAccessToken) {
      return NextResponse.json({
        pages: [],
        adAccounts: [],
        selectedPageId: null,
        selectedAdAccountId: null,
        error: 'Chưa kết nối tài khoản Facebook. Vui lòng nhấn "Kết Nối Facebook" trước.',
      });
    }

    // 1. Fetch Pages
    let pages: any[] = [];
    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category&limit=100&access_token=${encodeURIComponent(userAccessToken)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        pages = (pagesData.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category || '',
          accessToken: p.access_token,
        }));
      }
    } catch (e: any) {
      console.error('Error fetching Meta pages:', e);
    }

    // 2. Fetch Ad Accounts
    let adAccounts: any[] = [];
    try {
      const adsRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&limit=100&access_token=${encodeURIComponent(userAccessToken)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (adsRes.ok) {
        const adsData = await adsRes.json();
        adAccounts = (adsData.data || []).map((a: any) => ({
          id: a.id.replace('act_', ''),
          rawId: a.id,
          name: a.name || `Tài khoản ${a.id}`,
          status: a.account_status,
          currency: a.currency || 'VND',
        }));
      }
    } catch (e: any) {
      console.error('Error fetching Meta ad accounts:', e);
    }

    return NextResponse.json({
      pages,
      adAccounts,
      selectedPageId,
      selectedAdAccountId,
      userAccessTokenPresent: !!userAccessToken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pageId, pageName, pageAccessToken, adAccountId, adAccountName } = body ?? {};

    // Get existing user access token if available
    let userAccessToken: string | null = null;

    const existingPage = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Page' } });
    if (existingPage?.credentials) {
      try {
        const parsed = JSON.parse(decrypt(existingPage.credentials));
        userAccessToken = parsed.userToken || parsed.token || null;
      } catch {}
    }

    const existingAds = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Ads' } });
    if (!userAccessToken && existingAds?.credentials) {
      try {
        const parsed = JSON.parse(decrypt(existingAds.credentials));
        userAccessToken = parsed.userToken || parsed.token || null;
      } catch {}
    }

    // Save Selected Facebook Page
    if (pageId) {
      const pageData = {
        type: 'live',
        token: pageAccessToken || userAccessToken,
        userToken: userAccessToken,
        pageId,
        pageName: pageName || '',
      };
      await prisma.platformCredential.upsert({
        where: { platform: 'Facebook Page' },
        update: {
          credentials: encrypt(JSON.stringify(pageData)),
          isConnected: true,
          lastTested: new Date(),
        },
        create: {
          platform: 'Facebook Page',
          credentials: encrypt(JSON.stringify(pageData)),
          isConnected: true,
          lastTested: new Date(),
        },
      });
    }

    // Save Selected Facebook Ad Account
    if (adAccountId) {
      const cleanedAdId = adAccountId.replace('act_', '');
      const adsData = {
        type: 'live',
        token: userAccessToken,
        userToken: userAccessToken,
        adAccountId: cleanedAdId,
        adAccountName: adAccountName || '',
      };
      await prisma.platformCredential.upsert({
        where: { platform: 'Facebook Ads' },
        update: {
          credentials: encrypt(JSON.stringify(adsData)),
          isConnected: true,
          lastTested: new Date(),
        },
        create: {
          platform: 'Facebook Ads',
          credentials: encrypt(JSON.stringify(adsData)),
          isConnected: true,
          lastTested: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật lựa chọn Facebook Page và Tài khoản Quảng cáo thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

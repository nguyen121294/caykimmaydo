import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from '../lib/prisma';
import { getTokenForPlatform } from '../lib/sync-meta-utils';

async function debugFacebookAds() {
  console.log('Fetching token for Facebook Ads...');
  const { token, adAccountId } = await getTokenForPlatform('Facebook Ads');
  if (!token) return console.log('No FB Ads token found');
  
  console.log('1. Checking token with Facebook /me');
  let actId = adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : '';
  
  if (!actId) {
    console.log('No adAccountId in DB, fetching from /me/adaccounts');
    const actRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${encodeURIComponent(token)}`
    );
    const actData = await actRes.json();
    console.log('Ad Accounts Response:', JSON.stringify(actData, null, 2));
    const activeAcct = (actData?.data || []).find((a: any) => a.account_status === 1) || actData?.data?.[0];
    if (activeAcct) actId = activeAcct.id;
  }
  
  console.log('Using Ad Account ID:', actId);
  
  console.log('\n2. Fetching Insights (last_30d)');
  const url = `https://graph.facebook.com/v19.0/${actId}/insights?fields=campaign_name,spend,impressions,clicks,reach,actions,action_values&date_preset=last_30d&level=campaign&limit=50&access_token=${encodeURIComponent(token)}`;
  
  const campRes = await fetch(url);
  const campData = await campRes.json();
  
  console.log('Insights Response:');
  console.log(JSON.stringify(campData, null, 2));
}

debugFacebookAds().finally(() => prisma.$disconnect());

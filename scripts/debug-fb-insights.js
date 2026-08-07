require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Simplified decrypt just for this script
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_must_be_32_bytes_long_123';
const ALGORITHM = 'aes-256-cbc';
function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return null;
  }
}

async function debugFacebookAds() {
  const credential = await prisma.platformCredential.findUnique({ where: { platform: 'Facebook Ads' } });
  if (!credential) return console.log('No FB Ads credential found');
  
  const decrypted = decrypt(credential.credentials);
  const parsed = JSON.parse(decrypted);
  const token = parsed.token || parsed.userToken;
  let adAccountId = parsed.adAccountId;
  
  console.log('1. Checking token with Facebook /me');
  let actId = adAccountId ? (adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`) : '';
  
  if (!actId) {
    console.log('No adAccountId in DB, fetching from /me/adaccounts');
    const actRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${encodeURIComponent(token)}`
    );
    const actData = await actRes.json();
    console.log('Ad Accounts Response:', JSON.stringify(actData, null, 2));
    const activeAcct = (actData?.data || []).find(a => a.account_status === 1) || actData?.data?.[0];
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

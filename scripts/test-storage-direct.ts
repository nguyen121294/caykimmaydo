import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { prisma } from '../lib/prisma';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'order-assets';

  console.log(JSON.stringify({
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
    bucket,
  }));

  if (url && key) {
    const res = await fetch(`${url.replace(/\/$/, '')}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
    });
    console.log(`Supabase Bucket Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log('Buckets list:', data);
    } else {
      console.error('Bucket check failed:', await res.text());
    }
  } else {
    console.log('Chưa tìm thấy SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env / .env.local');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

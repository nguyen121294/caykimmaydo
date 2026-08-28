const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

function cleanStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

async function main() {
  console.log('--- Bắt đầu import dữ liệu Video Scripts & Lịch Content vào Database ---');

  // 1. Import Video Scripts (TOF, MOF, BOF)
  const scriptFile = path.join(process.cwd(), 'data', 'MayDo_VideoAds_Scripts_TeamWorkflow.xlsx');
  if (fs.existsSync(scriptFile)) {
    const wb = XLSX.readFile(scriptFile);
    const stages = [
      { sheet: 'TOF Scripts', stage: 'TOF' },
      { sheet: 'MOF Scripts', stage: 'MOF' },
      { sheet: 'BOF Scripts', stage: 'BOF' },
    ];

    let videoCount = 0;
    for (const { sheet, stage } of stages) {
      const ws = wb.Sheets[sheet];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Find header row (usually row 3)
      for (let i = 4; i < rows.length; i++) {
        const row = rows[i] || [];
        const scriptId = cleanStr(row[0]);
        if (!scriptId || scriptId.startsWith('📌') || scriptId.startsWith('GHI') || scriptId.startsWith('🎯')) continue;

        const contentType = cleanStr(row[1]);
        const hook = cleanStr(row[2]);
        const painPoint = cleanStr(row[3]);
        const solution = cleanStr(row[4]);
        const cta = cleanStr(row[5]);
        const caption = cleanStr(row[6]);
        const duration = cleanStr(row[7]);
        const targetAudience = cleanStr(row[8]);
        const expectedKpi = cleanStr(row[9]);

        await prisma.videoScript.upsert({
          where: { scriptId },
          update: {
            funnelStage: stage,
            contentType,
            hook,
            painPoint,
            solution,
            cta,
            caption,
            duration,
            targetAudience,
            expectedKpi,
          },
          create: {
            scriptId,
            funnelStage: stage,
            contentType,
            hook,
            painPoint,
            solution,
            cta,
            caption,
            duration,
            targetAudience,
            expectedKpi,
            status: 'Chưa Dùng',
          },
        });
        videoCount++;
        console.log(` [✓] Video Script: [${stage}] ${scriptId} - ${contentType}`);
      }
    }
    console.log(`\n🎉 Đã nạp thành công ${videoCount} kịch bản video!`);
  }

  // 2. Import Lịch Content 30 Ngày
  const trackFile = path.join(process.cwd(), 'data', 'MayDo_AI_Tracking_System.xlsx');
  if (fs.existsSync(trackFile)) {
    const wbTrack = XLSX.readFile(trackFile);
    const wsCal = wbTrack.Sheets['📅 Lịch Content 30 Ngày'];
    if (wsCal) {
      const rows = XLSX.utils.sheet_to_json(wsCal, { header: 1, defval: '' });
      let calCount = 0;
      for (let i = 4; i < rows.length; i++) {
        const row = rows[i] || [];
        const date = cleanStr(row[0]);
        if (!date || date.startsWith('📌') || date.startsWith('GHI')) continue;

        const week = cleanStr(row[1]);
        const contentType = cleanStr(row[2]);
        const topic = cleanStr(row[3]);
        const channel = cleanStr(row[4]);
        const postTime = cleanStr(row[5]);
        const orderRef = cleanStr(row[6]);
        const status = cleanStr(row[7]) || '📝 Chưa Làm';
        const notes = cleanStr(row[8]);

        const id = `cal-${date}-${contentType}-${i}`.replace(/\s+/g, '-').toLowerCase();

        await prisma.contentCalendar.upsert({
          where: { id },
          update: {
            date,
            week,
            contentType,
            topic,
            channel,
            postTime,
            orderRef,
            status,
            notes,
          },
          create: {
            id,
            date,
            week,
            contentType,
            topic,
            channel,
            postTime,
            orderRef,
            status,
            notes,
          },
        });
        calCount++;
      }
      console.log(`🎉 Đã nạp thành công ${calCount} ngày lịch content 30 ngày!`);
    }
  }

  const finalVideoCount = await prisma.videoScript.count();
  const finalCalCount = await prisma.contentCalendar.count();
  console.log(`\n=== TỔNG KẾT DB: VideoScript: ${finalVideoCount}, ContentCalendar: ${finalCalCount} ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

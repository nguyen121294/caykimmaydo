import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

function readSheet(filePath: string, sheetName: string): any[][] {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return [];
    }
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.log(`Sheet not found: ${sheetName} in ${filePath}`);
      return [];
    }
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  } catch (e: any) {
    console.error(`Error reading ${filePath}/${sheetName}:`, e?.message);
    return [];
  }
}

function cleanStr(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\n/g, ' ').trim();
}

async function main() {
  console.log('Seeding database...');

  const dataDir = path.join(process.cwd(), 'data');

  // 1. Seed Users
  const adminHash = await bcrypt.hash('maydo2024', 12);
  const testHash = await bcrypt.hash('johndoe123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@maydo.vn' },
    update: { password: adminHash, role: 'admin', name: 'Admin MayDo' },
    create: { email: 'admin@maydo.vn', password: adminHash, role: 'admin', name: 'Admin MayDo' },
  });
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { password: testHash, role: 'admin', name: 'Test Admin' },
    create: { email: 'john@doe.com', password: testHash, role: 'admin', name: 'Test Admin' },
  });

  console.log('Users seeded');

  // 2. Seed A/B Tests
  const abData = readSheet(path.join(dataDir, 'MayDo_Complete_Analytics_Dashboard.xlsx'), 'AB Test Tracking');
  for (let i = 4; i < abData.length; i++) {
    const row = abData[i] ?? [];
    const testId = cleanStr(row[0]);
    if (!testId || !testId.startsWith('AB')) continue;
    await prisma.aBTest.upsert({
      where: { testId },
      update: {
        testName: cleanStr(row[1]),
        dateStarted: cleanStr(row[2]),
        dateEnded: cleanStr(row[3]),
        variantA: cleanStr(row[4]),
        variantB: cleanStr(row[5]),
        budgetA: Number(row[6]) || 0,
        budgetB: Number(row[7]) || 0,
        impressionsA: Number(row[8]) || 0,
        impressionsB: Number(row[9]) || 0,
        clicksA: Number(row[10]) || 0,
        clicksB: Number(row[11]) || 0,
        conversionsA: Number(row[12]) || 0,
        conversionsB: Number(row[13]) || 0,
        revenueA: Number(row[14]) || 0,
        revenueB: Number(row[15]) || 0,
      },
      create: {
        testId,
        testName: cleanStr(row[1]),
        dateStarted: cleanStr(row[2]),
        dateEnded: cleanStr(row[3]),
        variantA: cleanStr(row[4]),
        variantB: cleanStr(row[5]),
        budgetA: Number(row[6]) || 0,
        budgetB: Number(row[7]) || 0,
        impressionsA: Number(row[8]) || 0,
        impressionsB: Number(row[9]) || 0,
        clicksA: Number(row[10]) || 0,
        clicksB: Number(row[11]) || 0,
        conversionsA: Number(row[12]) || 0,
        conversionsB: Number(row[13]) || 0,
        revenueA: Number(row[14]) || 0,
        revenueB: Number(row[15]) || 0,
      },
    });
  }
  console.log('A/B Tests seeded');

  // 3. Seed Video Scripts (TOF, MOF, BOF)
  const scriptFile = path.join(dataDir, 'MayDo_VideoAds_Scripts_TeamWorkflow.xlsx');
  for (const [sheetName, stage] of [['TOF Scripts', 'TOF'], ['MOF Scripts', 'MOF'], ['BOF Scripts', 'BOF']] as const) {
    const data = readSheet(scriptFile, sheetName);
    for (let i = 4; i < data.length; i++) {
      const row = data[i] ?? [];
      const scriptId = cleanStr(row[0]);
      if (!scriptId || scriptId.startsWith('📌') || scriptId.startsWith('GHI')) continue;
      await prisma.videoScript.upsert({
        where: { scriptId },
        update: {
          funnelStage: stage,
          contentType: cleanStr(row[1]),
          hook: cleanStr(row[2]),
          painPoint: cleanStr(row[3]),
          solution: cleanStr(row[4]),
          cta: cleanStr(row[5]),
          caption: cleanStr(row[6]),
          duration: cleanStr(row[7]),
          targetAudience: cleanStr(row[8]),
          expectedKpi: cleanStr(row[9]),
        },
        create: {
          scriptId,
          funnelStage: stage,
          contentType: cleanStr(row[1]),
          hook: cleanStr(row[2]),
          painPoint: cleanStr(row[3]),
          solution: cleanStr(row[4]),
          cta: cleanStr(row[5]),
          caption: cleanStr(row[6]),
          duration: cleanStr(row[7]),
          targetAudience: cleanStr(row[8]),
          expectedKpi: cleanStr(row[9]),
        },
      });
    }
  }
  console.log('Video Scripts seeded');

  // 4. Seed Team Workflow
  const teamData = readSheet(scriptFile, 'Team Workflow');
  for (let i = 5; i <= 9; i++) {
    const row = teamData[i] ?? [];
    const roleNum = cleanStr(row[0]);
    const role = cleanStr(row[1]);
    if (!role) continue;
    await prisma.teamWorkflow.upsert({
      where: { id: `team-${roleNum}` },
      update: {
        role,
        responsibilities: cleanStr(row[2]),
        sheetsAccess: cleanStr(row[3]),
        accessLevel: cleanStr(row[4]),
        dailyTasks: cleanStr(row[5]),
        weeklyTasks: cleanStr(row[6]),
        tools: cleanStr(row[7]),
      },
      create: {
        id: `team-${roleNum}`,
        roleNumber: roleNum,
        role,
        responsibilities: cleanStr(row[2]),
        sheetsAccess: cleanStr(row[3]),
        accessLevel: cleanStr(row[4]),
        dailyTasks: cleanStr(row[5]),
        weeklyTasks: cleanStr(row[6]),
        tools: cleanStr(row[7]),
      },
    });
  }
  console.log('Team Workflow seeded');

  // 5. Seed Orders
  const trackingFile = path.join(dataDir, 'MayDo_AI_Tracking_System.xlsx');
  const orderData = readSheet(trackingFile, '📦 Đơn Hàng');
  for (let i = 4; i < orderData.length; i++) {
    const row = orderData[i] ?? [];
    const orderId = cleanStr(row[0]);
    if (!orderId || !orderId.startsWith('DH')) continue;
    await prisma.order.upsert({
      where: { orderId },
      update: {
        customerName: cleanStr(row[1]),
        phone: cleanStr(row[2]),
        product: cleanStr(row[3]),
        fabricType: cleanStr(row[4]),
        tailorName: cleanStr(row[5]),
        orderDate: cleanStr(row[6]),
        expectedDate: cleanStr(row[7]),
        actualDate: cleanStr(row[8]),
        price: cleanStr(row[9]),
        status: cleanStr(row[10]) || 'Mới',
        hasMedia: cleanStr(row[11]) || 'No',
        hasFeedback: cleanStr(row[12]) || 'No',
        mediaLink: cleanStr(row[13]),
        notes: cleanStr(row[14]),
        action: cleanStr(row[15]),
      },
      create: {
        orderId,
        customerName: cleanStr(row[1]),
        phone: cleanStr(row[2]),
        product: cleanStr(row[3]),
        fabricType: cleanStr(row[4]),
        tailorName: cleanStr(row[5]),
        orderDate: cleanStr(row[6]),
        expectedDate: cleanStr(row[7]),
        actualDate: cleanStr(row[8]),
        price: cleanStr(row[9]),
        status: cleanStr(row[10]) || 'Mới',
        hasMedia: cleanStr(row[11]) || 'No',
        hasFeedback: cleanStr(row[12]) || 'No',
        mediaLink: cleanStr(row[13]),
        notes: cleanStr(row[14]),
        action: cleanStr(row[15]),
      },
    });
  }
  console.log('Orders seeded');

  // 6. Seed Tailor Checklist
  const checklistData = readSheet(trackingFile, '📋 Checklist Thợ');
  for (let i = 4; i < checklistData.length; i++) {
    const row = checklistData[i] ?? [];
    const orderId = cleanStr(row[0]);
    if (!orderId || !orderId.startsWith('DH')) continue;
    const tailorName = cleanStr(row[1]);
    const mediaType = cleanStr(row[2]);
    const id = `cl-${orderId}-${mediaType}`.replace(/\s/g, '-').toLowerCase();
    await prisma.tailorChecklist.upsert({
      where: { id },
      update: {
        orderId,
        tailorName,
        mediaType,
        description: cleanStr(row[3]),
        quantity: Number(row[4]) || 0,
        deadline: cleanStr(row[5]),
        submitted: cleanStr(row[6]) || 'Chưa',
        quality: cleanStr(row[7]),
        fileLink: cleanStr(row[8]),
        fileName: cleanStr(row[9]),
        notes: cleanStr(row[10]),
        bonus: cleanStr(row[11]),
      },
      create: {
        id,
        orderId,
        tailorName,
        mediaType,
        description: cleanStr(row[3]),
        quantity: Number(row[4]) || 0,
        deadline: cleanStr(row[5]),
        submitted: cleanStr(row[6]) || 'Chưa',
        quality: cleanStr(row[7]),
        fileLink: cleanStr(row[8]),
        fileName: cleanStr(row[9]),
        notes: cleanStr(row[10]),
        bonus: cleanStr(row[11]),
      },
    });
  }
  console.log('Tailor Checklists seeded');

  // 7. Seed Content Tracking
  const contentData = readSheet(trackingFile, '📊 Content Tracking');
  for (let i = 4; i < contentData.length; i++) {
    const row = contentData[i] ?? [];
    const contentId = cleanStr(row[0]);
    if (!contentId || !contentId.startsWith('CT')) continue;
    await prisma.contentTracking.upsert({
      where: { contentId },
      update: {
        orderId: cleanStr(row[1]),
        contentType: cleanStr(row[2]),
        channel: cleanStr(row[3]),
        postDate: cleanStr(row[4]),
        views: cleanStr(row[5]),
        saves: cleanStr(row[6]),
        comments: cleanStr(row[7]),
        shares: cleanStr(row[8]),
        engageRate: cleanStr(row[9]),
        usedAds: cleanStr(row[10]),
        adCost: cleanStr(row[11]),
        ordersFromAds: cleanStr(row[12]),
        roas: cleanStr(row[13]),
        aiSuggestion: cleanStr(row[14]),
      },
      create: {
        contentId,
        orderId: cleanStr(row[1]),
        contentType: cleanStr(row[2]),
        channel: cleanStr(row[3]),
        postDate: cleanStr(row[4]),
        views: cleanStr(row[5]),
        saves: cleanStr(row[6]),
        comments: cleanStr(row[7]),
        shares: cleanStr(row[8]),
        engageRate: cleanStr(row[9]),
        usedAds: cleanStr(row[10]),
        adCost: cleanStr(row[11]),
        ordersFromAds: cleanStr(row[12]),
        roas: cleanStr(row[13]),
        aiSuggestion: cleanStr(row[14]),
      },
    });
  }
  console.log('Content Tracking seeded');

  // 8. Seed Content Calendar
  const calData = readSheet(trackingFile, '📅 Lịch Content 30 Ngày');
  for (let i = 4; i < calData.length; i++) {
    const row = calData[i] ?? [];
    const date = cleanStr(row[0]);
    if (!date || date.startsWith('📌')) continue;
    const id = `cal-${date}-${cleanStr(row[2])}`.replace(/\s/g, '-').toLowerCase();
    await prisma.contentCalendar.upsert({
      where: { id },
      update: {
        date,
        week: cleanStr(row[1]),
        contentType: cleanStr(row[2]),
        topic: cleanStr(row[3]),
        channel: cleanStr(row[4]),
        postTime: cleanStr(row[5]),
        orderRef: cleanStr(row[6]),
        status: cleanStr(row[7]) || '📝 Chưa Làm',
        notes: cleanStr(row[8]),
      },
      create: {
        id,
        date,
        week: cleanStr(row[1]),
        contentType: cleanStr(row[2]),
        topic: cleanStr(row[3]),
        channel: cleanStr(row[4]),
        postTime: cleanStr(row[5]),
        orderRef: cleanStr(row[6]),
        status: cleanStr(row[7]) || '📝 Chưa Làm',
        notes: cleanStr(row[8]),
      },
    });
  }
  console.log('Content Calendar seeded');

  // 9. Seed Inbox Scripts
  const inboxFile = path.join(dataDir, 'Script_Inbox_ChốtĐơn_MayĐo.xlsx');
  const masterData = readSheet(inboxFile, '📋 Master Script');
  for (let i = 2; i < masterData.length; i++) {
    const row = masterData[i] ?? [];
    const customerType = cleanStr(row[0]);
    const content = cleanStr(row[6]);
    if (!content && !customerType) continue;
    const actualType = customerType || 'continuation';
    const msgNum = cleanStr(row[3]);
    const sender = cleanStr(row[4]);
    const id = `inbox-master-${i}`;
    await prisma.inboxScript.upsert({
      where: { id },
      update: {
        customerType: actualType,
        colorTag: cleanStr(row[1]),
        identifiers: cleanStr(row[2]),
        messageNumber: msgNum,
        sender,
        label: cleanStr(row[5]),
        content,
        sheetName: 'Master',
      },
      create: {
        id,
        customerType: actualType,
        colorTag: cleanStr(row[1]),
        identifiers: cleanStr(row[2]),
        messageNumber: msgNum,
        sender,
        label: cleanStr(row[5]),
        content,
        sheetName: 'Master',
      },
    });
  }
  console.log('Inbox Scripts seeded');

  // 10. Seed Inbox KPIs
  const kpiInboxData = readSheet(inboxFile, '📊 KPI Inbox');
  for (let i = 2; i < kpiInboxData.length; i++) {
    const row = kpiInboxData[i] ?? [];
    const date = cleanStr(row[0]);
    if (!date) continue;
    const id = `inbox-kpi-${i}`;
    await prisma.inboxKpi.upsert({
      where: { id },
      update: {
        date,
        customerType: cleanStr(row[1]),
        customerId: cleanStr(row[2]),
        status: cleanStr(row[3]),
        lastMessage: cleanStr(row[4]),
        result: cleanStr(row[5]),
        notes: cleanStr(row[6]),
        agent: cleanStr(row[7]),
      },
      create: {
        id,
        date,
        customerType: cleanStr(row[1]),
        customerId: cleanStr(row[2]),
        status: cleanStr(row[3]),
        lastMessage: cleanStr(row[4]),
        result: cleanStr(row[5]),
        notes: cleanStr(row[6]),
        agent: cleanStr(row[7]),
      },
    });
  }
  console.log('Inbox KPIs seeded');

  // 11. Seed KPI Snapshot
  await prisma.kpiSnapshot.upsert({
    where: { id: 'main-kpi' },
    update: {
      totalOrders: 55,
      totalRevenue: 49500000,
      totalAdSpend: 8500000,
      roas: 5.8,
      conversionRate: 12,
      totalContent: 22,
      avgViews: 9200,
      saveRate: 5.8,
      closeRate: 12,
      mediaRate: 68,
    },
    create: {
      id: 'main-kpi',
      totalOrders: 55,
      totalRevenue: 49500000,
      totalAdSpend: 8500000,
      roas: 5.8,
      conversionRate: 12,
      totalContent: 22,
      avgViews: 9200,
      saveRate: 5.8,
      closeRate: 12,
      mediaRate: 68,
    },
  });
  console.log('KPI Snapshot seeded');

  // 12. Seed Automation Logs
  const logEntries = [
    { level: 'success', source: 'MetaSync', message: 'Sync Meta Ads data thành công - 5 campaigns updated', details: 'TOF: 3 campaigns, MOF: 1, BOF: 1' },
    { level: 'success', source: 'GoogleSheets', message: 'Sync Google Sheets thành công - Data Input Template updated' },
    { level: 'warning', source: 'KPIAlert', message: 'CPM TOF vượt 15,000đ - Cần tối ưu creative', details: 'CPM hiện tại: 16,200đ' },
    { level: 'success', source: 'Analytics', message: 'CT003 Pinterest Recreate đạt ROAS 7.2x - Đề xuất scale ads', details: 'Budget hiện tại: 300K' },
    { level: 'error', source: 'KPIAlert', message: 'Thợ B: tỷ lệ media 47% - Dưới ngưỡng 50%', details: 'Cần họa 1-1 và nhắc quy trình' },
    { level: 'info', source: 'Scheduler', message: 'Đã lên lịch 7 content tuần tới', details: 'Ưu tiên slot 20h thứ 3, 5, 7' },
    { level: 'warning', source: 'CustomerAgent', message: 'Follow-up 8 khách chưa gửi feedback', details: 'Gửi voucher 100k để khích lệ' },
    { level: 'success', source: 'SlackNotify', message: 'Đã gửi thông báo Slack cho team', details: 'Weekly report + KPI alerts' },
    { level: 'info', source: 'System', message: 'Automation scheduler chạy mỗi 6 giờ - Next run: 14:00' },
    { level: 'success', source: 'MetaSync', message: 'Import A/B test results thành công - 5 tests', details: 'AB001-AB005 updated' },
  ];

  for (let i = 0; i < logEntries.length; i++) {
    const entry = logEntries[i];
    const id = `log-seed-${i}`;
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - i * 2);
    await prisma.automationLog.upsert({
      where: { id },
      update: { ...entry, timestamp },
      create: { id, ...entry, timestamp },
    });
  }
  console.log('Automation Logs seeded');

  // 13. Seed Customers
  const customerData = [
    { id: 'cust-1', name: 'Nguyễn Thị Mai', phone: '0901234567', email: 'mai@gmail.com', source: 'Facebook', totalOrders: 3, totalSpent: 2700000, status: 'VIP', tags: 'VIP, Khách quen' },
    { id: 'cust-2', name: 'Trần Văn Hùng', phone: '0912345678', email: 'hung@gmail.com', source: 'TikTok', totalOrders: 1, totalSpent: 900000, status: 'Mới', tags: 'GenZ' },
    { id: 'cust-3', name: 'Lê Thị Hoa', phone: '0923456789', source: 'Zalo', totalOrders: 2, totalSpent: 1800000, status: 'Đã mua', tags: 'Áo dài' },
    { id: 'cust-4', name: 'Phạm Minh Tuấn', phone: '0934567890', email: 'tuan@gmail.com', source: 'Instagram', totalOrders: 0, totalSpent: 0, status: 'Đang tư vấn' },
    { id: 'cust-5', name: 'Võ Thị Lan', phone: '0945678901', source: 'Giới thiệu', totalOrders: 5, totalSpent: 4500000, status: 'VIP', tags: 'VIP, Vest nam' },
    { id: 'cust-6', name: 'Đỗ Quang Hải', phone: '0956789012', source: 'Google', totalOrders: 1, totalSpent: 950000, status: 'Đã mua' },
    { id: 'cust-7', name: 'Bùi Thị Ngọc', phone: '0967890123', email: 'ngoc@gmail.com', source: 'Facebook', totalOrders: 0, totalSpent: 0, status: 'Không phản hồi' },
    { id: 'cust-8', name: 'Hoàng Văn Đức', phone: '0978901234', source: 'TikTok', totalOrders: 2, totalSpent: 1850000, status: 'Đã mua', tags: 'Đồ công sở' },
  ];

  for (const c of customerData) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: { name: c.name, phone: c.phone, email: c.email || null, source: c.source, totalOrders: c.totalOrders, totalSpent: c.totalSpent, status: c.status, tags: c.tags || null },
      create: c,
    });
  }
  console.log('Customers seeded');

  // 14. Seed Leads
  const leadData = [
    { id: 'lead-1', name: 'Trần Thị Hương', phone: '0911111111', source: 'Facebook', stage: 'Mới', value: 1200000, assignee: 'Minh', nextAction: 'Gọi tư vấn' },
    { id: 'lead-2', name: 'Nguyễn Quốc Bảo', phone: '0922222222', source: 'TikTok', stage: 'Đang tư vấn', value: 900000, assignee: 'Lan', nextAction: 'Gửi báo giá' },
    { id: 'lead-3', name: 'Lý Thị Phương', phone: '0933333333', source: 'Instagram', stage: 'Báo giá', value: 2500000, assignee: 'Minh', nextAction: 'Chờ xác nhận' },
    { id: 'lead-4', name: 'Vũ Đình Quang', phone: '0944444444', source: 'Zalo', stage: 'Đặt cọc', value: 1800000, assignee: 'Lan', nextAction: 'Lấy số đo' },
    { id: 'lead-5', name: 'Đặng Thị Thảo', phone: '0955555555', source: 'Google', stage: 'Chốt đơn', value: 3200000, assignee: 'Minh' },
    { id: 'lead-6', name: 'Phan Văn Tài', phone: '0966666666', source: 'Facebook', stage: 'Mới', value: 800000, nextAction: 'Nhắn tin Zalo' },
    { id: 'lead-7', name: 'Trương Thị Ngân', phone: '0977777777', source: 'Giới thiệu', stage: 'Đang tư vấn', value: 1500000, assignee: 'Lan' },
    { id: 'lead-8', name: 'Cao Minh Tú', phone: '0988888888', source: 'TikTok', stage: 'Thua', value: 900000, notes: 'Khách chọn bên khác' },
  ];

  for (const l of leadData) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: { name: l.name, phone: l.phone, source: l.source, stage: l.stage, value: l.value, assignee: l.assignee || null, nextAction: l.nextAction || null, notes: l.notes || null },
      create: l,
    });
  }
  console.log('Leads seeded');

  // 15. Seed Finance Entries
  const financeData = [
    { id: 'fin-1', date: '2025-04-01', type: 'Thu', category: 'Doanh thu may đo', description: 'Đơn MD-001 Áo dài', amount: 900000, orderId: 'MD-001' },
    { id: 'fin-2', date: '2025-04-02', type: 'Thu', category: 'Cọc đơn hàng', description: 'Cọc đơn MD-002', amount: 450000, orderId: 'MD-002' },
    { id: 'fin-3', date: '2025-04-03', type: 'Chi', category: 'Vải + Nguyên liệu', description: 'Nhập vải lụa 20m', amount: 3200000 },
    { id: 'fin-4', date: '2025-04-05', type: 'Chi', category: 'Quảng cáo Ads', description: 'Facebook Ads tuần 1/4', amount: 1500000 },
    { id: 'fin-5', date: '2025-04-06', type: 'Thu', category: 'Doanh thu may đo', description: 'Đơn MD-003 + MD-004', amount: 1950000 },
    { id: 'fin-6', date: '2025-04-08', type: 'Chi', category: 'Lương thợ may', description: 'Lương thợ A tuần 1', amount: 2000000 },
    { id: 'fin-7', date: '2025-04-10', type: 'Thu', category: 'Doanh thu may đo', description: 'Đơn vest MD-005', amount: 2500000, orderId: 'MD-005' },
    { id: 'fin-8', date: '2025-04-12', type: 'Chi', category: 'Vận chuyển', description: 'Giao hàng nội thành', amount: 350000 },
    { id: 'fin-9', date: '2025-04-15', type: 'Thu', category: 'Thu khác', description: 'Sửa đồ cho khách cũ', amount: 200000 },
    { id: 'fin-10', date: '2025-04-18', type: 'Chi', category: 'Điện nước', description: 'Tiền điện xưởng T4', amount: 800000 },
    { id: 'fin-11', date: '2025-05-01', type: 'Thu', category: 'Doanh thu may đo', description: 'Đơn áo dài + vest T5', amount: 3800000 },
    { id: 'fin-12', date: '2025-05-03', type: 'Chi', category: 'Quảng cáo Ads', description: 'TikTok Ads T5', amount: 2000000 },
  ];

  for (const f of financeData) {
    await prisma.financeEntry.upsert({
      where: { id: f.id },
      update: { date: f.date, type: f.type, category: f.category, description: f.description, amount: f.amount, orderId: f.orderId || null },
      create: f,
    });
  }
  console.log('Finance entries seeded');

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e: any) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

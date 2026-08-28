const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function cleanStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

async function main() {
  console.log('--- Bắt đầu import kịch bản từ docs/sale.xlsx ---');
  const filePath = path.join(process.cwd(), 'docs', 'sale.xlsx');
  const wb = XLSX.readFile(filePath);

  // 1. Parse sheet 'kichban'
  const wsKichban = wb.Sheets['kichban'];
  const kichbanRows = XLSX.utils.sheet_to_json(wsKichban, { header: 1, defval: '' });

  const scriptsToInsert = [];

  // Nhóm 1: Flow chốt đơn
  // Row 2: Hỏi nhu cầu đã có mẫu
  scriptsToInsert.push({
    id: 'script-flow-1',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: 'Ngay khi khách nhắn hỏi mẫu cụ thể',
    messageNumber: 'Bước 1',
    sender: 'SHOP',
    label: 'Hỏi nhu cầu (Đã có mẫu)',
    content: cleanStr(kichbanRows[2]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 3: Hỏi nhu cầu chưa có mẫu
  scriptsToInsert.push({
    id: 'script-flow-2',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: 'Khi khách chưa chọn được mẫu, cần tư vấn dịp',
    messageNumber: 'Bước 2',
    sender: 'SHOP',
    label: 'Hỏi nhu cầu (Chưa có mẫu)',
    content: cleanStr(kichbanRows[3]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 4: Báo giá (*)
  scriptsToInsert.push({
    id: 'script-flow-3',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'emerald',
    identifiers: cleanStr(kichbanRows[4]?.[2]), // "Ngay khi có đủ thông tin mẫu, số đo...\nTuỳ nhu cầu upsell: Phí custom +450k, Remake +350k"
    messageNumber: 'Bước 3',
    sender: 'SHOP',
    label: 'Báo giá & Upsell vải/form (*)',
    content: cleanStr(kichbanRows[4]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 5: Báo gian may
  scriptsToInsert.push({
    id: 'script-flow-4',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: cleanStr(kichbanRows[5]?.[2]) || 'Chủ động báo trước khi khách hỏi để tạo sự an tâm',
    messageNumber: 'Bước 4',
    sender: 'SHOP',
    label: 'Báo thời gian may (7-15 ngày)',
    content: cleanStr(kichbanRows[5]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 6: Xin thông tin
  scriptsToInsert.push({
    id: 'script-flow-5',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: cleanStr(kichbanRows[6]?.[2]) || 'Khi khách đồng ý chốt may',
    messageNumber: 'Bước 5',
    sender: 'SHOP',
    label: 'Xin thông tin nhận hàng',
    content: cleanStr(kichbanRows[6]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 7: Xin thông tin số đo phù hợp với đồ
  scriptsToInsert.push({
    id: 'script-flow-6',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: cleanStr(kichbanRows[7]?.[2]) || 'Sau khi khách chốt thông tin nhận hàng',
    messageNumber: 'Bước 6',
    sender: 'SHOP',
    label: 'Xin thông tin số đo',
    content: 'Để may được bộ này bạn cho shop xin các thông số đo cơ thể này nhaa:\n- Chiều cao & Cân nặng:\n- Vòng ngực (V1):\n- Vòng eo trên rốn (V2):\n- Vòng mông (V3):\n- Chiều dài mong muốn (nếu có):',
    sheetName: 'Kịch bản thực tế',
  });

  // Row 8 + 9: Chốt thông tin cọc + STK
  const cọcContent = cleanStr(kichbanRows[8]?.[1]) + '\n\n' + cleanStr(kichbanRows[9]?.[1]);
  scriptsToInsert.push({
    id: 'script-flow-7',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'amber',
    identifiers: 'Cọc 70% bắt đầu may, 30% còn lại thanh toán sau khi gửi ảnh hoàn thành',
    messageNumber: 'Bước 7',
    sender: 'SHOP',
    label: 'Chốt thông tin cọc 70% & STK',
    content: cọcContent,
    sheetName: 'Kịch bản thực tế',
  });

  // Row 10: Chốt thông tin đơn
  scriptsToInsert.push({
    id: 'script-flow-8',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: 'Xác nhận lại toàn bộ thông số và cam kết trước khi tiến hành may',
    messageNumber: 'Bước 8',
    sender: 'SHOP',
    label: 'Chốt thông tin đơn hàng',
    content: cleanStr(kichbanRows[10]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 11: Chính sách cam kết
  scriptsToInsert.push({
    id: 'script-flow-9',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'amber',
    identifiers: cleanStr(kichbanRows[11]?.[2]) || 'Tải về gửi kèm hình ảnh chính sách',
    messageNumber: 'Bước 9',
    sender: 'SHOP',
    label: 'Chính sách may & Cam kết form 80%',
    content: cleanStr(kichbanRows[11]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 13: Chốt thanh toán 30%
  scriptsToInsert.push({
    id: 'script-flow-10',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'emerald',
    identifiers: cleanStr(kichbanRows[13]?.[2]) || 'Nhắn ngay sau khi gửi ảnh xác nhận thành phẩm',
    messageNumber: 'Bước 10',
    sender: 'SHOP',
    label: 'Gửi ảnh hoàn thành & Thu 30% còn lại',
    content: cleanStr(kichbanRows[13]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 14 + 15: Thông báo đơn hàng đã lên đường & Dặn dò
  const shipContent = cleanStr(kichbanRows[14]?.[1]) + '\n\n' + cleanStr(kichbanRows[15]?.[1]);
  scriptsToInsert.push({
    id: 'script-flow-11',
    customerType: 'Quy trình chốt đơn',
    colorTag: 'blue',
    identifiers: 'Ngay khi chuẩn bị gửi hàng. Gửi kèm hình ảnh vận đơn cho khách',
    messageNumber: 'Bước 11',
    sender: 'SHOP',
    label: 'Xác nhận gửi hàng & Dặn dò thử đồ',
    content: shipContent,
    sheetName: 'Kịch bản thực tế',
  });

  // Nhóm 2: Xử lý từ chối & Tình huống thực chiến
  // Row 24, 25, 26: Giá cao
  const giaCaoContent = cleanStr(kichbanRows[24]?.[1]) + '\n\n' + cleanStr(kichbanRows[25]?.[1]) + '\n\n' + cleanStr(kichbanRows[26]?.[1]);
  scriptsToInsert.push({
    id: 'script-objection-1',
    customerType: 'Xử lý từ chối',
    colorTag: 'purple',
    identifiers: 'Kỹ thuật neo giá trị may đo cá nhân vs đồ may sẵn đại trà, gợi ý form basic',
    messageNumber: 'Tình huống 1',
    sender: 'SHOP',
    label: 'Khách chê giá cao / So sánh giá',
    content: giaCaoContent,
    sheetName: 'Kịch bản thực tế',
  });

  // Row 27, 28, 29: Hỏi nhiều nhưng chưa chốt
  const hoiNhieuContent = cleanStr(kichbanRows[27]?.[1]) + '\n\n' + cleanStr(kichbanRows[28]?.[1]) + '\n\n' + cleanStr(kichbanRows[29]?.[1]);
  scriptsToInsert.push({
    id: 'script-objection-2',
    customerType: 'Xử lý từ chối',
    colorTag: 'purple',
    identifiers: 'Tạo urgency lịch kín + nhắc chính sách free tư vấn & chỉnh sửa',
    messageNumber: 'Tình huống 2',
    sender: 'SHOP',
    label: 'Khách hỏi nhiều nhưng chưa chốt',
    content: hoiNhieuContent,
    sheetName: 'Kịch bản thực tế',
  });

  // Row 30: Seen không rep
  scriptsToInsert.push({
    id: 'script-objection-3',
    customerType: 'Xử lý từ chối',
    colorTag: 'purple',
    identifiers: 'Khách đã xem nhưng chưa trả lời sau 24h, gợi ý may chung hoặc deal đồng giá',
    messageNumber: 'Tình huống 3',
    sender: 'SHOP',
    label: 'Khách Seen không rep',
    content: cleanStr(kichbanRows[30]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Sheet sale pineline: Cross-sale item phối
  scriptsToInsert.push({
    id: 'script-cross-sale-1',
    customerType: 'Xử lý từ chối',
    colorTag: 'purple',
    identifiers: 'Sau khi đã chốt sản phẩm chính, bán thêm sản phẩm phụ giảm 20%',
    messageNumber: 'Cross-Sale',
    sender: 'SHOP',
    label: 'Gợi ý đồ phối kèm (Giảm 20%)',
    content: '“Dạ em thấy mình may bộ này rất phù hợp phối thêm một trong số các item này ạ. Mình có thể tham khảo thêm bên em đang có chương trình giảm 20% cho sản phẩm sau đó ạ. Mình muốn may thêm đồ phối hong để em báo giá combo luôn cho tiện mình đặt luôn nha”',
    sheetName: 'Kịch bản thực tế',
  });

  // Nhóm 3: Chăm sóc sau bán & Kích hoạt lại (Retention & Feedback)
  // Row 16: Gửi ưu đãi feedback
  scriptsToInsert.push({
    id: 'script-retention-1',
    customerType: 'CSKH & Retention',
    colorTag: 'emerald',
    identifiers: 'Gửi ngay khi chuẩn bị giao hàng hoặc khi khách vừa nhận đồ',
    messageNumber: 'CSKH 1',
    sender: 'SHOP',
    label: 'Mời quay video Feedback nhận 3 ưu đãi',
    content: cleanStr(kichbanRows[16]?.[1]) + '\n\n*Mẫu video feedback đơn giản 5-10s:\n"Form xinh, mặc lên tự tin lắmm" là được nhận voucher 100k rồi ạ 💖',
    sheetName: 'Kịch bản thực tế',
  });

  // Row 17: 7-30 days sau mua
  scriptsToInsert.push({
    id: 'script-retention-2',
    customerType: 'CSKH & Retention',
    colorTag: 'emerald',
    identifiers: 'Nhắn tự động sau 7 - 30 ngày kể từ ngày đặt hàng gần nhất',
    messageNumber: 'CSKH 2',
    sender: 'SHOP',
    label: 'Ưu đãi 7 - 30 ngày sau mua (Giảm 30% SP2)',
    content: cleanStr(kichbanRows[17]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 18: 30-90 days sau mua
  scriptsToInsert.push({
    id: 'script-retention-3',
    customerType: 'CSKH & Retention',
    colorTag: 'emerald',
    identifiers: 'Follow-up khách cũ sau 30 - 90 ngày, voucher hiệu lực 7 ngày',
    messageNumber: 'CSKH 3',
    sender: 'SHOP',
    label: 'Tri ân 30 - 90 ngày sau mua (Tặng 20%)',
    content: cleanStr(kichbanRows[18]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Row 19: >90 days sau mua
  scriptsToInsert.push({
    id: 'script-retention-4',
    customerType: 'CSKH & Retention',
    colorTag: 'emerald',
    identifiers: 'Gửi khách lâu ngày chưa quay lại, khảo sát dịch vụ và gửi deal bất ngờ',
    messageNumber: 'CSKH 4',
    sender: 'SHOP',
    label: 'Chăm sóc >90 ngày (Khảo sát & Tặng 20%)',
    content: cleanStr(kichbanRows[19]?.[1]),
    sheetName: 'Kịch bản thực tế',
  });

  // Nhóm 4: Chương trình Khách hàng thân thiết (Membership & Quyền lợi)
  scriptsToInsert.push({
    id: 'script-loyalty-1',
    customerType: 'Khách hàng thân thiết',
    colorTag: 'amber',
    identifiers: 'Quy cách: 1.000đ = 1 điểm. Phân hạng: Silver (2500), Gold (4500), VIP (>8000)',
    messageNumber: 'Membership 1',
    sender: 'SHOP',
    label: 'Thông báo tích điểm & Hạng thành viên',
    content: '“Dạ với đơn của mình đang có giá trị là 2.000.000đ nên sẽ được tích 2.000 điểm ạ. Điểm tích luỹ hiện tại của mình là [Điểm] nên sẽ nhận được các quyền lợi riêng biệt của hạng [Hạng] nhaaa. Mình quay lại nhiều nhiều để shop nâng thêm quyền lợi riêng cho mình nha ạa 💖”',
    sheetName: 'Kịch bản thực tế',
  });

  scriptsToInsert.push({
    id: 'script-loyalty-2',
    customerType: 'Khách hàng thân thiết',
    colorTag: 'amber',
    identifiers: 'Gửi bảng chi tiết quyền lợi khi khách hỏi về chế độ thành viên',
    messageNumber: 'Membership 2',
    sender: 'SHOP',
    label: 'Bảng quyền lợi Hạng Thành Viên (Silver / Gold / Diamond)',
    content: `👑 QUYỀN LỢI THÀNH VIÊN CÂY KIM MAY ĐO:

✨ HẠNG SILVER:
- Lưu số đo cá nhân vĩnh viễn
- Miễn phí vận chuyển (Freeship)
- Ưu tiên chỉnh sửa (2 lần)
- Voucher giảm giá 3%

🏆 HẠNG GOLD:
- Tất cả quyền lợi Silver
- Ưu tiên chỉnh sửa (3 lần) & Ưu tiên lịch may
- Preview mẫu mới độc quyền
- Voucher sinh nhật 300.000đ & Voucher giảm 5%

💎 HẠNG DIAMOND / VIP:
- Tất cả quyền lợi Gold
- Ưu tiên chỉnh sửa (4 lần) & Giữ slot mùa cao điểm
- Tặng 01 thiết kế riêng miễn phí
- Voucher sinh nhật 500.000đ & Voucher giảm 7%`,
    sheetName: 'Kịch bản thực tế',
  });

  console.log(`Chuẩn bị nạp ${scriptsToInsert.length} kịch bản thực tế vào Database...`);

  for (const s of scriptsToInsert) {
    await prisma.inboxScript.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
    console.log(` [✓] Upserted: ${s.customerType} -> ${s.label}`);
  }

  const totalCount = await prisma.inboxScript.count();
  console.log(`\n🎉 HOÀN TẤT! Tổng số kịch bản trong Database hiện tại: ${totalCount} (Bao gồm cả các kịch bản cũ và kịch bản thực tế mới)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

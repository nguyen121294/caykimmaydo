import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { parseTaskViewBuffer } from '../lib/task-import';

async function main() {
  console.log('🔄 Đang đọc file docs/taskview.xlsx...');
  const filePath = path.join(process.cwd(), 'docs', 'taskview.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Không tìm thấy file:', filePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  const tasks = parseTaskViewBuffer(buffer);
  console.log(`📊 Đã parse thành công ${tasks.length} công việc từ file Excel.`);

  if (tasks.length === 0) {
    console.warn('⚠️ Không có dữ liệu để nạp.');
    return;
  }

  console.log('🧹 Đang dọn dẹp các task cũ trong database...');
  await prisma.task.deleteMany({});

  console.log('💾 Đang lưu dữ liệu vào database qua createMany...');
  const dataToInsert = tasks.map((t) => ({
    name: t.name,
    department: t.department,
    assignee: t.assignee,
    description: t.description,
    deadline: t.deadline,
    status: t.status,
    priority: 'Trung bình',
    note: t.note,
    checklist: t.checklist as any,
  }));

  const res = await prisma.task.createMany({
    data: dataToInsert,
  });

  console.log(`✅ Đã nạp thành công ${res.count} công việc vào bảng Task!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

# Sổ tài chính theo năm

## Goal
Chuyển trang `/finance` thành sổ thu chi editable theo mẫu Excel, lưu theo năm, có trạng thái chốt tháng, audit log, import template, biểu đồ và chỉ admin truy cập.

## Tasks
- [x] Phân tích workbook và mapping dữ liệu. Verify: render/inspect toàn bộ sheet mẫu.
- [x] Mở rộng Prisma schema cho dòng tổng, dòng chi tiết, sổ năm, chốt tháng và audit log. Verify: `prisma validate`.
- [x] Xây API admin CRUD/bulk import/lock/log. Verify: kiểm tra auth và validation cho từng route.
- [x] Xây bảng editable, chọn năm, thêm/xóa dòng, biểu đồ và lịch sử. Verify: thao tác trên browser local.
- [x] Tạo template `.xlsx` đúng cấu trúc upload. Verify: inspect công thức và render trực quan.
- [x] Chạy lint, typecheck/build và smoke test. Verify: không còn lỗi liên quan thay đổi.

## Done When
- [x] Admin có thể quản lý sổ từng năm, xem năm cũ, import template, đánh dấu chốt tháng, xem log và biểu đồ tổng quan.

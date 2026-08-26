# CRM–Order Unified Flow

## Goal
Liên kết CRM với Orders, nhập đúng file Excel tháng 6–8/2026, quản lý ảnh theo loại và hỗ trợ hai luồng sale không tạo khách trùng.

## Tasks
- [x] Viết test parser cho AD–AE, dòng TOTAL/trống, SĐT `1111111111` và mã đơn ổn định → Verify: test đỏ trước khi triển khai.
- [x] Thêm migration mở rộng Order/Customer/User và bảng OrderAsset → Verify: `prisma validate` và migration diff hợp lệ.
- [x] Tạo service transaction Customer–Order và import preview/apply có `importBatchId` → Verify: import lại không nhân đôi dữ liệu.
- [x] Thêm API tìm khách, tạo đơn từ khách cũ/mới và cập nhật SĐT thiếu → Verify: hai flow sale trả về đúng `customerId`.
- [x] Nâng cấp form Orders với customer picker, khách mới inline, bộ lọc thiếu SĐT và URL ảnh phân loại → Verify: build thành công.
- [x] Thêm nút Tạo đơn hàng từ CRM → Verify: form Order mở với khách đã chọn và điền sẵn thông tin.
- [x] Chạy test, lint, type-check, build và kiểm tra runtime → Verify: không có lỗi blocking.
- [x] Backup, migrate production, dry-run file và chỉ import sau khi số liệu preview khớp → Verify: 30 đơn, ngày đúng, rollback được theo batch.

## Done When
- [ ] Hai flow sale hoạt động, Orders liên kết CRM, ảnh phân loại đúng và file được import an toàn vào production. (Còn cấu hình kho ảnh và deploy web.)

## Notes
- AD–AE ghép tuần tự với 30 dòng đơn thật.
- Cột W là chi phí vải thực tế.
- Đơn thiếu SĐT dùng `1111111111`, không tạo CRM và có cờ `needsCustomerPhone`.
- File có 361 ảnh nhúng đã tách và mapping được; chưa upload vì môi trường chưa có credential kho lưu trữ.

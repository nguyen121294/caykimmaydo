# Sync Hub Navigation

## Goal
Tập trung mọi thao tác đồng bộ tại `/sync-hub`, thêm khoảng thời gian đồng bộ và đảm bảo sidebar xuất hiện trên mọi page nghiệp vụ.

## Tasks
- [ ] Bọc các route nghiệp vụ bằng app shell dùng chung → Verify: `/posts` và các page chính có đúng một sidebar.
- [ ] Đổi mọi nút thực hiện đồng bộ ngoài Sync Hub thành link `/sync-hub` → Verify: không còn handler sync từ UI ngoài Hub.
- [ ] Thêm lựa chọn 7/30/90 ngày hoặc toàn thời gian tại Sync Hub → Verify: payload sync chứa `days`.
- [ ] Áp dụng time range cho luồng Meta sync → Verify: API chuyển range vào Facebook Page, Ads và Instagram.
- [ ] Chạy lint, TypeScript và kiểm tra UI local.

## Done When
- [ ] Sync Hub là nơi duy nhất có nút chạy đồng bộ.
- [ ] Mọi page nghiệp vụ có sidebar thống nhất.

## Notes
- Các link đồng bộ dùng chung `/sync-hub`, không truyền platform.

# Instagram Ads Per Row

## Goal
Hiển thị mỗi quảng cáo Instagram thành một dòng riêng, định danh bằng Meta `adId`.

## Tasks
- [x] Thêm model `InstagramAd` vào Prisma → Verify: Prisma schema validation succeeds.
- [x] Đồng bộ từng Meta ad vào `InstagramAd` → Verify: each `adId` is upserted independently.
- [x] Thêm API đọc danh sách Instagram ads → Verify: endpoint returns ad-shaped rows.
- [x] Cho tab Instagram quảng cáo dùng API ads → Verify: UI renders one row per returned ad.
- [x] Chạy Prisma validation, kiểm tra TypeScript liên quan và kiểm tra trang local.

## Done When
- [x] Mỗi Meta `adId` được lưu và hiển thị thành một dòng độc lập.

## Notes
- Giữ nguyên luồng bài Instagram tự nhiên.
- Bao gồm ads có chi tiêu ở mọi trạng thái Meta.

# Technical Debt Register

> Baseline: 2026-08-16 · Branch: `feature/crm-google-sheet-import`
>
> Đây là backlog sống. Số dòng bên dưới đúng tại thời điểm baseline và sẽ dịch chuyển khi code thay đổi. Khi hoàn thành một mục, đổi `[ ]` thành `[x]`, ghi PR/commit và ngày xác nhận.

## 1. Cách dùng tài liệu này

Mức ưu tiên:

| Mức | Ý nghĩa | SLA đề xuất |
|---|---|---|
| P0 | Có khả năng ảnh hưởng bảo mật hoặc tính toàn vẹn dữ liệu | Xử lý trước release tiếp theo |
| P1 | Rủi ro lỗi nghiệp vụ cao hoặc cản trở thay đổi quan trọng | 1–2 sprint |
| P2 | Làm chậm phát triển, khó kiểm thử hoặc khó vận hành | Sửa dần theo module |
| P3 | Cải thiện chất lượng, hiệu năng hoặc trải nghiệm phát triển | Khi chạm vào file liên quan |

Nguyên tắc:

- Không thay toàn bộ `any` bằng type assertion khác; dữ liệu ngoài hệ thống phải được runtime validation.
- Không thêm index chỉ vì audit đề xuất; kiểm tra query thực tế và `EXPLAIN ANALYZE` trước.
- Không chạy `npm audit fix --force` trên production branch; các upgrade breaking phải có nhánh và regression test riêng.
- Mỗi hạng mục hoàn tất phải chạy tối thiểu: `npm run lint`, `npx tsc --noEmit`, test liên quan và `npm run build`.

## 2. Executive summary

| ID | Mức | Hạng mục | Hiện trạng | Trạng thái |
|---|---|---|---|---|
| TD-001 | P0 | Dependency vulnerabilities | `npm audit`: 54 vulnerabilities, gồm 1 critical và 35 high | [ ] |
| TD-002 | P0 | API nhận JSON không có runtime schema | Nhiều route đưa body trực tiếp vào Prisma/business logic | [ ] |
| TD-003 | P0 | Excel CRM import không idempotent | Re-import cộng lại doanh thu/đơn/điểm | [ ] |
| TD-004 | P1 | Migration CRM chưa được triển khai | `normalizedPhone` migration đã tạo nhưng chưa deploy | [ ] |
| TD-005 | P1 | 277 explicit `any` | 71 file; type-coverage threshold là 47 | [ ] |
| TD-006 | P1 | Auth/session typing còn `any` | Role/id dựa vào cast, ảnh hưởng authorization | [ ] |
| TD-007 | P1 | Money dùng `Float` | Có nguy cơ sai số cho doanh thu/chi tiêu | [ ] |
| TD-008 | P1 | Date nghiệp vụ lưu bằng `String` | Khó validate, sort, range query và timezone | [ ] |
| TD-009 | P2 | 27 schema recommendations | Nhiều false positive; 10 mục cần đo/đánh giá | [ ] |
| TD-010 | P2 | Component/service quá lớn | 9 file trên 395 dòng; khó test và review | [ ] |
| TD-011 | P2 | Test coverage rất thấp | Chỉ phát hiện 1 test file | [ ] |
| TD-012 | P2 | Build phát hiện dynamic-route warning | `/api/campaigns` dùng `request.url` khi static analysis | [ ] |
| TD-013 | P3 | 11 lint warnings hiện hữu | Hook dependencies và `<img>` chưa tối ưu | [ ] |
| TD-014 | P3 | Prisma generator configuration | Chưa khai báo output path; Prisma 7 sẽ bỏ hành vi cũ | [ ] |

## 3. P0 — cần xử lý trước

### TD-001 — Dependency vulnerabilities

Audit snapshot ngày 2026-08-16:

- Tổng: 54 vulnerabilities.
- Critical: 1.
- High: 35.
- Moderate: 12.
- Low: 6.

| Package trực tiếp | File/dòng | Mức audit cao nhất | Ghi chú/hướng xử lý |
|---|---|---|---|
| `next-auth@4.24.11` | `package.json:104` | Critical | Upgrade có kiểm soát lên bản đã vá; test login, OAuth, session callback và middleware. Audit gợi ý `4.24.15`. |
| `next@14.2.28` | `package.json:103` | High | Không `--force` thẳng lên Next 16. Lập kế hoạch nâng framework, React compatibility và Netlify runtime. |
| `xlsx@^0.18.5` | `package.json:126` | High, không có fix trong registry hiện tại | Đánh giá thay bằng thư viện được duy trì; khóa kích thước file và fuzz test parser trong thời gian chuyển đổi. |
| `lodash@4.17.21` | `package.json:100` | High | Upgrade riêng, chạy regression cho các thao tác object/path/template. |
| `postcss@8.4.30` | `package.json:29` | High | Nâng cùng chuỗi Next/Tailwind, tránh lệch peer dependencies. |
| `webpack@5.99.5` | `package.json:125` | High | Nâng trong nhánh build-tooling, xác nhận Netlify build. |
| `react-use@17.6.0` | `package.json:119` | High qua `js-cookie` | Upgrade và regression test những hook thực sự đang dùng. |
| `gray-matter@4.0.3` | `package.json:96` | High qua `js-yaml` | Kiểm tra có dùng production không; upgrade/replace nếu có parse nội dung không tin cậy. |
| `@netlify/async-workloads@^0.0.106` | `package.json:45` | High/moderate qua dependency tree | Fix đề xuất có breaking downgrade/upgrade; phối hợp Netlify workloads trước khi đổi. |

Các transitive package đáng chú ý: `axios`, `brace-expansion`, `extract-zip`, `fast-uri`, `glob`, `http-proxy-middleware`, `image-size`, `lodash.pick`, `lodash.set`, `sharp`, `tmp`, `uuid`, các package Octokit và Netlify/Stackbit.

Checklist:

- [ ] Xuất `npm audit --json` và phân loại production/dev dependency.
- [ ] Sửa `next-auth` trước, chạy full auth regression.
- [ ] Chọn chiến lược thay `xlsx` vì audit báo không có fix.
- [ ] Nâng các package non-breaking trong một PR riêng.
- [ ] Nâng Next/webpack/postcss trong một PR migration riêng.
- [ ] Chạy `npm audit --omit=dev --audit-level=high` sau khi sửa.

Done when:

- Không còn critical vulnerability trong production dependency.
- High vulnerability còn lại phải có risk acceptance ghi rõ package, đường khai thác và ngày review lại.

### TD-002 — API body chưa có runtime validation

Các dòng đọc JSON cần Zod schema, giới hạn độ dài/range, whitelist field và response 400 thống nhất:

| Module | Dòng đọc body | Việc cần làm |
|---|---:|---|
| Auth login | `app/api/auth/login/route.ts:8` | Validate email/password; rate-limit và generic auth error. |
| Signup | `app/api/signup/route.ts:8` | Validate email/password/name; normalize email. |
| Superadmin login | `app/api/superadmin/login/route.ts:5` | Validate + rate-limit; không phân biệt account tồn tại. |
| Admin users | `app/api/admin/users/route.ts:51,99` | Enum role, password policy, ID format. |
| Superadmin users | `app/api/superadmin/users/route.ts:48,97` | Như admin users; chia sẻ schema. |
| Users | `app/api/users/route.ts:26,68` | Whitelist field; cấm client tự nâng role. |
| Customers | `app/api/customers/route.ts:30,48,68` | Không spread body trực tiếp vào Prisma; dùng create/update DTO. |
| Leads | `app/api/leads/route.ts:22,34,46` | `route.ts:23` hiện create bằng body trực tiếp; whitelist field. |
| Orders | `app/api/orders/route.ts:25,59` | Parse số tiền/số lượng, enum trạng thái, giới hạn chuỗi. |
| Tasks | `app/api/tasks/route.ts:16,50` | Schema checklist và patch fields. |
| Content | `app/api/content/route.ts:30` | Schema theo content type. |
| Finance | `app/api/finance/route.ts:103,186,232` | Validate năm/tháng/rows/amount; giới hạn batch đã có cần đưa vào schema. |
| Settings | `app/api/settings/route.ts:58` | Discriminated union theo platform, không nhận credential field ngoài whitelist. |
| Password settings | `app/api/settings/password/route.ts:14` | Password policy và confirmation. |
| Connections | `app/api/connections/route.ts:75` | Schema theo action/platform; giới hạn token strings. |
| Connection sync | `app/api/connections/sync/route.ts:19` | Enum platform và date range. |
| CRM loyalty earn | `app/api/crm/loyalty/earn/route.ts:21` | Positive finite order value, customer/order ID. |
| CRM loyalty redeem | `app/api/crm/loyalty/redeem/route.ts:27` | Positive integer points, allowed redemption rules. |
| CRM Google Sheet | `app/api/crm/import-google-sheet/route.ts:171` | URL/action/startRow schema; URL host guard đã có nhưng nên đưa vào Zod. |
| Meta accounts | `app/api/meta/accounts/route.ts:109` | Schema credential/account selection. |
| Meta sync | `app/api/marketing/sync/meta/route.ts:30` | Enum platforms/days; hiện fallback `{}`. |
| Meta worker | `app/api/marketing/sync/meta/worker/route.ts:137` | Validate signed workload payload trước xử lý. |

Mẫu hoàn thành mỗi route:

```ts
const parsed = requestSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
}
```

Không trả toàn bộ Zod issue cho client production nếu có thể lộ cấu trúc nội bộ.

### TD-003 — Excel/CSV CRM import đang cộng trùng số liệu

File: `app/api/crm/import-file/route.ts`.

Điểm nợ kỹ thuật:

- `:19,25,96`: dữ liệu Excel là `any`, chưa validate shape.
- `:131`: đọc giá trị đơn hàng từ cột J.
- `:150-152`: re-import cộng lại `totalSpent`, `totalOrders`, `loyaltyPoints`.
- `:165-167`: ghi tổng/điểm mới sau khi cộng.
- `:181-191`: tạo loyalty transaction mới mỗi lần import.
- `:198-212`: customer mới cũng nhận doanh thu/điểm từ file.
- `:222,247`: lỗi dùng `any`, chưa phân loại row error/client error.
- Chưa giới hạn kích thước upload trước khi `arrayBuffer()`.
- Không dùng `normalizedPhone` unique key mới.

Rủi ro: cùng một file được import hai lần sẽ làm sai doanh thu và loyalty.

Phương án đề xuất:

- Nếu CRM chỉ quản lý hồ sơ: bỏ hoàn toàn cập nhật financial/loyalty khỏi endpoint này.
- Nếu cần import đơn: tạo `ImportedOrder`/source record có unique source key rồi cộng theo order idempotently.
- Dùng chung parser/normalizer với Google Sheet import.
- Preview trước commit và transaction toàn batch.
- Giới hạn file size và số dòng.

Done when:

- Import cùng file hai lần cho kết quả DB giống lần đầu.
- Không tạo loyalty transaction trùng.
- Có test duplicate phone trong file, duplicate với DB, blank phone, malformed amount và oversized file.

## 4. P1 — dữ liệu và type safety

### TD-004 — Deploy migration `normalizedPhone`

Liên quan:

- `prisma/schema.prisma:312-342` — model `Customer`.
- `prisma/schema.prisma:316` — `normalizedPhone String? @unique`.
- `prisma/migrations/20260816000000_add_customer_normalized_phone/migration.sql:1-4`.
- `lib/customer-phone.ts:1` — canonical normalizer.

Việc còn lại:

- [ ] Backup/restore point trước migration production.
- [ ] Kiểm tra customer trùng theo phone đã normalize.
- [ ] Quyết định merge/mark các duplicate cũ.
- [ ] Chạy `npx prisma migrate deploy` trong release workflow.
- [ ] Backfill `normalizedPhone` theo batch sau khi audit duplicate.
- [ ] Xác nhận unique constraint bằng concurrent import test.

Không backfill mù trước khi xử lý duplicate cũ vì unique index có thể fail hoặc chọn nhầm canonical customer.

### TD-005 — 277 explicit `any` trong 71 file

Baseline được đo bằng đúng regex của `type_coverage.py`: `:\s*any`, `as any`, `<any>`. TypeScript compiler vẫn pass; đây là type escape hatch debt.

#### Thứ tự sửa

1. Auth/authorization và request bodies.
2. Finance, order, customer, loyalty.
3. External API payloads: Meta/Facebook/Instagram/Telegram/ManyChat.
4. Shared UI state và form types.
5. `catch (error: any)` đổi thành `unknown` + helper `getErrorMessage`.
6. Seed/debug scripts cuối cùng.

#### Inventory đầy đủ

| File | Số explicit `any` | Dòng hiện tại |
|---|---:|---|
| `lib/sync-meta-utils.ts` | 27 | 76, 112, 121, 225, 257, 287, 327, 328, 329, 330, 331, 413, 431, 439, 483, 549, 569, 574, 696, 697, 698, 791, 801, 825, 830, 836 |
| `app/team/_components/team-content.tsx` | 17 | 120, 151, 160, 175, 177, 210, 255, 322, 347, 351, 352, 364, 464, 467, 526, 645, 883 |
| `app/orders/_components/orders-content.tsx` | 16 | 47, 68, 69, 72, 84, 107, 125, 160, 211, 220, 228, 254, 312, 340, 341, 357 |
| `app/api/instagram/posts/route.ts` | 15 | 14, 15, 24, 38, 45, 55, 60, 69, 70, 81, 123, 141, 174, 192, 271 |
| `app/api/connections/route.ts` | 11 | 20, 25, 65, 73, 136, 174, 213, 347, 353, 369, 398 |
| `app/api/analytics/route.ts` | 9 | 11, 16, 36, 44, 67, 100, 118, 131 |
| `app/api/marketing/demographics/route.ts` | 8 | 103, 105, 125, 128, 129, 166 |
| `app/api/meta/accounts/route.ts` | 8 | 50, 58, 65, 70, 78, 86, 97, 186 |
| `app/api/tasks/route.ts` | 7 | 9, 19, 38, 43, 54, 63, 75 |
| `app/analytics/_components/analytics-content.tsx` | 6 | 10, 32, 42, 115, 179 |
| `app/api/facebook/posts/route.ts` | 6 | 14, 29, 58, 120, 182, 242 |
| `app/api/settings/route.ts` | 6 | 11, 31, 45, 53, 108, 127 |
| `app/inbox/_components/inbox-content.tsx` | 6 | 10, 60, 84, 91, 104, 119 |
| `app/api/crm/import-file/route.ts` | 5 | 19, 25, 96, 222, 247 |
| `app/api/orders/route.ts` | 5 | 9, 18, 52, 63, 72 |
| `app/content/_components/content-content.tsx` | 5 | 79, 83, 87, 98, 196 |
| `app/dashboard/_components/dashboard-content.tsx` | 5 | 13, 67, 200, 252, 367 |
| `scripts/seed.ts` | 5 | 9, 21, 22, 28, 550 |
| `app/api/admin/users/route.ts` | 4 | 9, 36, 84, 120 |
| `app/api/customers/route.ts` | 4 | 21, 35, 55, 71 |
| `app/api/finance/route.ts` | 4 | 132, 141, 146, 150 |
| `app/api/leads/route.ts` | 4 | 13, 25, 37, 49 |
| `app/components/sidebar.tsx` | 4 | 63, 103, 104, 113 |
| `app/connections/_components/connections_content.tsx` | 4 | 45, 258, 265, 299 |
| `app/crm/_components/crm_content.tsx` | 4 | 161, 199, 236, 253 |
| `app/sync-hub/_components/sync-hub-content.tsx` | 4 | 13, 178, 208, 351 |
| `lib/auth-options.ts` | 4 | 49, 56, 58, 59 |
| `app/analytics/_components/budget-chart.tsx` | 3 | 4, 12, 13 |
| `app/analytics/_components/weekly-chart.tsx` | 3 | 4, 6, 19 |
| `app/api/content/route.ts` | 3 | 12, 23, 38 |
| `app/api/dashboard/route.ts` | 3 | 95, 100, 210 |
| `app/api/instagram/ads/route.ts` | 3 | 13, 31, 71 |
| `app/api/superadmin/users/route.ts` | 3 | 33, 82, 118 |
| `app/import-export/_components/import_export_content.tsx` | 3 | 32, 45, 95 |
| `app/resources/_components/resources-content.tsx` | 3 | 38, 66, 86 |
| `app/settings/_components/settings-content.tsx` | 3 | 10, 126, 135 |
| `app/api/inbox/route.ts` | 2 | 9, 18 |
| `app/api/marketing/sync/instagram/route.ts` | 2 | 60, 156 |
| `app/api/marketing/sync/manychat/route.ts` | 2 | 105, 154 |
| `app/api/marketing/sync/meta/route.ts` | 2 | 14, 85 |
| `app/api/oauth/facebook/callback/route.ts` | 2 | 128, 149 |
| `app/api/settings/password/route.ts` | 2 | 20, 34 |
| `app/dashboard/_components/funnel-chart.tsx` | 2 | 4, 8 |
| `app/dashboard/_components/revenue-chart.tsx` | 2 | 4, 36 |
| `app/dashboard/campaigns/_components/campaign-manager.tsx` | 2 | 114, 192 |
| `app/login/page.tsx` | 2 | 75, 86 |
| `lib/utils.ts` | 2 | 13, 37 |
| `middleware.ts` | 2 | 5, 15 |
| `app/api/ab-tests/route.ts` | 1 | 9 |
| `app/api/auth/login/route.ts` | 1 | 22 |
| `app/api/automation/route.ts` | 1 | 36 |
| `app/api/campaigns/route.ts` | 1 | 90 |
| `app/api/connections/sync/route.ts` | 1 | 71 |
| `app/api/crm/import-google-sheet/route.ts` | 1 | 244 |
| `app/api/crm/loyalty/earn/route.ts` | 1 | 92 |
| `app/api/crm/loyalty/history/route.ts` | 1 | 28 |
| `app/api/crm/loyalty/redeem/route.ts` | 1 | 85 |
| `app/api/inbox-kpi/route.ts` | 1 | 13 |
| `app/api/marketing/metrics/route.ts` | 1 | 137 |
| `app/api/marketing/sync/meta/worker/route.ts` | 1 | 188 |
| `app/api/marketing/sync/telegram/route.ts` | 1 | 154 |
| `app/api/oauth/zalo/callback/route.ts` | 1 | 69 |
| `app/api/signup/route.ts` | 1 | 22 |
| `app/api/team/route.ts` | 1 | 9 |
| `app/components/form-controls.tsx` | 1 | 30 |
| `app/dashboard/campaigns/[id]/page.tsx` | 1 | 104 |
| `app/finance/page.tsx` | 1 | 9 |
| `app/posts/_components/facebook-posts-content.tsx` | 1 | 29 |
| `app/posts/_components/instagram-posts-content.tsx` | 1 | 33 |
| `scripts/debug-fb-insights.ts` | 1 | 21 |
| `scripts/safe-seed.ts` | 1 | 23 |

Mục tiêu theo giai đoạn:

- [ ] Giai đoạn 1: ≤200 explicit `any`; không còn `any` trong auth và CRM API.
- [ ] Giai đoạn 2: ≤100; không còn `any` trong finance/order/external API contracts.
- [ ] Giai đoạn 3: ≤47 để type-coverage audit pass.
- [ ] Giai đoạn 4: không tạo `any` mới; CI chặn regression.

### TD-006 — Auth/session type safety

Files/dòng:

- `middleware.ts:5,15` — request/token typed `any`.
- `lib/auth-options.ts:49,56,58,59` — callback payload và session role/id cast `any`.
- `app/api/admin/users/route.ts:9` — authorization dựa vào cast.
- `app/api/settings/route.ts:11,53` — admin checks dựa vào cast.
- `app/api/settings/password/route.ts:20` — session email cast.
- `app/api/connections/route.ts:20,73` — admin checks dựa vào cast.
- `app/finance/page.tsx:9` — server authorization cast.
- `app/components/sidebar.tsx:63` và các UI liên quan — role cast.

Hướng sửa:

- Hoàn thiện module augmentation trong `types/next-auth.d.ts` cho `Session.user.id`, `Session.user.role` và JWT fields.
- Dùng type NextAuth callback chính thức thay vì annotation `any`.
- Tạo helper server-side `requireAdminSession()`; UI hide menu không thay thế authorization server.
- Test user/admin/superadmin và session thiếu role.

### TD-007 — Money dùng floating point

Schema lines:

- `prisma/schema.prisma:75-76` — `Order.total`, `Order.deposit`.
- `prisma/schema.prisma:200-211` — AB test budgets/revenue.
- `prisma/schema.prisma:285-294` — KPI financial metrics.
- `prisma/schema.prisma:321` — `Customer.totalSpent`.
- `prisma/schema.prisma:351` — loyalty amount.
- `prisma/schema.prisma:363` — lead value.
- `prisma/schema.prisma:378` — finance amount.
- `prisma/schema.prisma:464` — Facebook ad spend.
- `prisma/schema.prisma:488` — Instagram post ad spend.
- `prisma/schema.prisma:512` — Instagram ad spend.

Quyết định cần chốt:

- VND nguyên: ưu tiên `BigInt`/integer minor unit.
- Tỷ lệ/ROAS: `Decimal` với precision rõ ràng.
- Không dùng cùng một representation cho tiền và tỷ lệ.

Migration cần dual-read/dual-write hoặc backfill được kiểm chứng; không đổi type trực tiếp trên production mà không kiểm tra rounding.

### TD-008 — Date nghiệp vụ lưu bằng `String`

Các vùng chính:

- `prisma/schema.prisma:69-73` — order/expected/actual/try/delivery dates.
- `prisma/schema.prisma:96-97` — task start/deadline.
- `prisma/schema.prisma:113` — checklist deadline.
- `prisma/schema.prisma:162` — content post date.
- `prisma/schema.prisma:178` — calendar date.
- `prisma/schema.prisma:196-197` — AB test dates.
- `prisma/schema.prisma:273-274` — sync job đã dùng `DateTime?`, dùng làm mẫu.
- `prisma/schema.prisma:300` — inbox KPI date.
- `prisma/schema.prisma:322,329,336` — customer last/completed dates.
- `prisma/schema.prisma:365-366` — lead next action date.
- `prisma/schema.prisma:374` — finance date.

Lợi ích chuyển sang `DateTime`/date-only convention:

- Range query và sort đúng.
- Validation tập trung.
- Tránh chuỗi `dd/mm/yyyy`, ISO và empty string trộn lẫn.
- Index theo thời gian có ý nghĩa.

Trước migration cần inventory format hiện có và quy tắc timezone `Asia/Saigon`.

## 5. P2 — schema, architecture và tests

### TD-009 — Phân loại 27 schema recommendations

Audit này là heuristic. Bảng dưới phân biệt việc thật sự cần xem xét và false positive/redundant suggestion.

| # | Audit item | File/dòng | Kết luận sơ bộ | Hành động |
|---:|---|---|---|---|
| 1 | Account thiếu `createdAt` | `prisma/schema.prisma:25-41` | Optional | Chỉ thêm nếu cần audit account linking. |
| 2 | Index `providerAccountId` | `:30,40` | Có thể không cần | NextAuth thường query compound provider+id; kiểm tra query log. |
| 3 | Session thiếu `createdAt` | `:43-49` | Optional | Thêm nếu cần session audit/retention. |
| 4 | VerificationToken thiếu `createdAt` | `:51-57` | Optional | `expires` có thể đã đủ cho cleanup. |
| 5 | Index Order.orderId | `:61` | False positive | `@unique` đã tạo index. Đóng sau khi xác nhận migration. |
| 6 | Index Task.orderId | `:94` | Candidate | Thêm nếu query task theo orderId. |
| 7 | Index TailorChecklist.orderId | `:108` | Candidate cao | UI/order flow có khả năng query theo orderId. |
| 8 | Index VideoScript.scriptId | `:126` | False positive | `@unique` đã tạo index. |
| 9 | Index ContentTracking.contentId | `:158` | False positive | `@unique` đã tạo index. |
| 10 | Index ContentTracking.orderId | `:159` | Candidate | Đo query theo order. |
| 11 | Index ABTest.testId | `:194` | False positive | `@unique` đã tạo index. |
| 12 | Index SyncJob.groupId | `:260,278` | Redundant | Composite `[groupId, sequence]` hỗ trợ prefix `groupId`. |
| 13 | Index SyncJob.messageId | `:271` | Candidate | Chỉ thêm nếu callback lookup bằng messageId. |
| 14 | Index InboxKpi.customerId | `:302` | Candidate | Thêm nếu CRM drill-down dùng customerId. |
| 15 | Index Customer.zaloId | `:318` | Candidate | Thêm nếu sync/lookups theo Zalo ID. |
| 16 | Index LoyaltyTransaction.customerId | `:346` | Candidate cao | History endpoint thường lọc theo customerId. |
| 17 | Index LoyaltyTransaction.orderId | `:348` | Candidate | Thêm nếu chống trùng/tìm transaction theo order. |
| 18 | Index FinanceEntry.orderId | `:379` | Candidate cao | Reconciliation thường lookup theo orderId. |
| 19 | FinanceLedgerRow thiếu `createdAt` | `:408` | False positive | Field đã tồn tại. |
| 20 | Index FinanceLedgerRow.ledgerId | `:398,411` | Redundant | Composite `[ledgerId, sortOrder]` đã hỗ trợ prefix. |
| 21 | FinanceMonthStatus thiếu `createdAt` | `:415-426` | Optional | Chỉ cần nếu audit vòng đời tháng. |
| 22 | Index FinanceMonthStatus.ledgerId | `:417,425` | Redundant | Unique `[ledgerId, month]` hỗ trợ prefix. |
| 23 | Index FinanceAuditLog.ledgerId | `:430,444` | Redundant | Composite `[ledgerId, createdAt]` đã hỗ trợ prefix. |
| 24 | Index FacebookPost.pageId | `:452` | Candidate cao | Feed/page filtering thường dùng pageId. |
| 25 | Index InstagramPost.igAccountId | `:478` | Candidate cao | Account filtering thường dùng igAccountId. |
| 26 | Index InstagramAd.adId | `:501` | False positive | `@unique` đã tạo index. |
| 27 | Index InstagramAd.adSetId | `:505` | Candidate | Thêm nếu report theo ad set. |

Candidate index phải có bằng chứng:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT ... WHERE "customerId" = ...;
```

Done when: mỗi item được đánh dấu một trong `implemented`, `rejected with reason`, hoặc `deferred with metric`.

### TD-010 — God files / tách trách nhiệm

| File | Dòng | Nợ chính | Hướng tách |
|---|---:|---|---|
| `app/team/_components/team-content.tsx` | 941 | UI, data fetching, forms, checklist, role rendering | `types`, API service, `useTeam`, task form, board/table, user panel. |
| `lib/sync-meta-utils.ts` | 860 | Credentials, Graph calls, transforms, DB writes cho nhiều platform | Meta client types, fetch layer, transformers, repository, per-platform services. |
| `app/connections/_components/connections_content.tsx` | 770 | UI + credential workflows + sync logic | Connection cards, credential forms, API service, hook. |
| `app/crm/_components/crm_content.tsx` | 662 | Table, filters, import, add form, loyalty modal | `CustomerTable`, `CustomerImportDialog`, `CustomerForm`, `LoyaltyDialog`, hooks/services. |
| `app/posts/_components/instagram-posts-content.tsx` | 536 | List, filters, detail/media UI, data logic | Shared post types/service, list, detail dialog, metrics. |
| `app/superadmin/page.tsx` | 497 | Page và nhiều admin concerns | Server page + client panels/forms. |
| `app/posts/_components/facebook-posts-content.tsx` | 496 | Tương tự Instagram và có duplicate UI | Shared social-post primitives + platform adapters. |
| `app/dashboard/_components/dashboard-content.tsx` | 416 | Dashboard orchestration + many widgets | Data hook + widget components. |
| `app/marketing/_components/marketing_content.tsx` | 414 | Multiple channel/report concerns | Per-channel panels + typed API layer. |
| `app/orders/_components/orders-content.tsx` | 402 | List, export, KPIs, form, checklist | Order types/service/hook, list, export util, form, checklist. |
| `app/api/connections/route.ts` | 401 | Nhiều action/platform trong một endpoint | Schema discriminated union + handler per action/platform. |
| `app/sync-hub/_components/sync-hub-content.tsx` | 395 | Job orchestration, logs, UI | Sync API service, job hook, log panel, controls. |

Không tách chỉ vì số dòng. Mỗi lần tách phải giảm coupling và có test bảo vệ hành vi.

### TD-011 — Test coverage

Phát hiện duy nhất:

- `lib/customer-phone.test.ts` — unit test normalizer.

Các test còn thiếu theo mức rủi ro:

| Mức | Module | Cases tối thiểu |
|---|---|---|
| P0 | Auth/admin/superadmin | Unauthorized, role escalation, invalid payload, password rules. |
| P0 | CRM import file | Re-import idempotency, duplicate phone, malformed/oversized file. |
| P0 | Finance | Closed month, concurrent edit, invalid amount, audit log. |
| P1 | Google Sheet CRM import | URL validation, gid parsing, duplicate preview, blank phone, transaction rollback. |
| P1 | Loyalty earn/redeem | Negative/zero values, insufficient points, concurrent redemption. |
| P1 | Meta sync | Pagination, rate limit, partial error, idempotent upsert. |
| P2 | UI critical flows | Login, CRM preview-confirm, finance save, connection setup. |

Đề xuất nền tảng:

- Unit/integration: Vitest hoặc Node test runner nhất quán.
- API: gọi route handler với mocked auth/Prisma hoặc integration DB riêng.
- E2E: Playwright trên database test, không dùng production credentials.

### TD-012 — Build-time dynamic route warning

- `app/api/campaigns/route.ts:7` dùng `new URL(request.url)`.
- Production build log báo route không thể static render vì dynamic server usage.

Hành động:

- Thêm `export const dynamic = 'force-dynamic'` nếu endpoint luôn phụ thuộc request/session/query.
- Hoặc dùng API phù hợp của Next và xác nhận caching semantics.
- Thêm build assertion để warning không bị nuốt trong log.

Build cũng từng log lỗi kết nối Supabase khi collect page data. Cần trace page/module nào gọi DB ở build time và chuyển sang runtime dynamic rendering nếu dữ liệu không thể có lúc build.

## 6. P3 — lint và tooling

### TD-013 — Lint warnings

Hook dependency warnings:

| File/dòng | Hành động |
|---|---|
| `app/content/_components/content-content.tsx:35` | Bọc `fetchData` bằng `useCallback` hoặc đưa logic vào effect; tránh disable rule. |
| `app/dashboard/campaigns/[id]/page.tsx:28-30` | Ổn định `fetchData`, thêm dependency đúng. |
| `app/dashboard/campaigns/_components/campaign-manager.tsx:32-34` | Như trên. |
| `app/dashboard/_components/dashboard-content.tsx:38-42` | Như trên. |
| `app/inbox/_components/inbox-content.tsx:26` | Như trên. |
| `app/orders/_components/orders-content.tsx:63` | Như trên. |
| `app/sync-hub/_components/sync-hub-content.tsx:145-148` | Ổn định `fetchLogs` và kiểm tra polling cleanup. |

Image optimization warnings:

- `app/posts/_components/facebook-posts-content.tsx:322,416`.
- `app/posts/_components/instagram-posts-content.tsx:345,467`.

Đánh giá domain ảnh động/remotePatterns trước khi đổi sang `next/image`; nếu giữ `<img>`, ghi rõ lý do và kích thước cố định để hạn chế layout shift.

### TD-014 — Prisma generator/output và local engine lock

- `prisma/schema.prisma:1-3` chưa có generator `output`.
- Prisma cảnh báo hành vi output mặc định sẽ không còn được hỗ trợ ở Prisma 7.
- Trên Windows, `prisma generate` từng fail `EPERM` vì `query_engine-windows.dll.node` bị Node process khác giữ lock.

Hành động:

- Chọn explicit generated-client output tương thích imports hiện tại trước khi lên Prisma 7.
- Điều chỉnh import path theo một PR riêng.
- Release workflow phải dừng dev server/process giữ Prisma engine trước generate.
- Không xóa DLL/node_modules bằng lệnh destructive khi chưa xác định process.

## 7. Kế hoạch thực hiện đề xuất

### Sprint A — Guardrails và dữ liệu CRM

- [ ] TD-004 deploy/backfill `normalizedPhone` an toàn.
- [ ] TD-003 làm Excel import idempotent.
- [ ] TD-002 thêm Zod cho Customer/CRM/Loyalty endpoints.
- [ ] Thêm test CRM import và loyalty.
- [ ] Loại `any` khỏi các file CRM API/UI đã chạm.

### Sprint B — Auth và dependency critical

- [ ] TD-001 nâng `next-auth`, test auth flows.
- [ ] TD-006 typed session + centralized admin guards.
- [ ] Zod/rate-limit cho login/signup/admin endpoints.
- [ ] Chốt chiến lược thay `xlsx`.

### Sprint C — Finance/order correctness

- [ ] TD-007 quyết định money representation.
- [ ] TD-008 inventory date strings.
- [ ] Validate finance/order/task payloads.
- [ ] Thêm finance/order integration tests.

### Sprint D — Meta sync và kiến trúc

- [ ] Tách `lib/sync-meta-utils.ts`.
- [ ] Định nghĩa Meta API response types và runtime schemas.
- [ ] Giảm `any` xuống dưới 100.
- [ ] Tách các god component theo feature seam.

### Sprint E — Database performance và cleanup

- [ ] Đo candidate indexes từ TD-009 bằng production-like query plan.
- [ ] Sửa lint warnings.
- [ ] Sửa dynamic build warning.
- [ ] Đưa type-coverage, lint, tests và audit threshold vào CI.

## 8. Commands để cập nhật baseline

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
python .agents/skills/lint-and-validate/scripts/type_coverage.py .
python .agents/skills/database-design/scripts/schema_validator.py .
npm.cmd audit --audit-level=high
npx.cmd prisma validate
npx.cmd next build
```

Đếm đúng explicit `any` theo checker:

```powershell
rg -n ":\s*any\b|\bas\s+any\b|<any>" . -g "*.ts" -g "*.tsx" -g "!node_modules/**" -g "!.next/**" -g "!**/*.d.ts"
```

## 9. Definition of Done cho technical-debt PR

- Phạm vi nhỏ, có trước/sau rõ ràng.
- Không trộn dependency major upgrade với feature nghiệp vụ.
- Có test chứng minh behavior được giữ hoặc lỗi được sửa.
- Migration có rollback/recovery plan.
- `npm run lint`, `npx tsc --noEmit` và `npm run build` pass.
- Cập nhật số lượng `any`, audit findings và trạng thái item trong file này.
- Không đánh dấu hoàn tất chỉ vì đã thêm type assertion hoặc suppress lint.

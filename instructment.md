# Instructment — Hướng dẫn ngữ cảnh cho dự án VCB HRM

Tài liệu này bổ sung cho **Cursor Rules** (`.cursor/rules/*.mdc`). Mục tiêu: khi làm nhanh (“vibe”) hoặc nhờ AI sinh mã, vẫn **tránh lỗi môi trường, lệch kiến trúc, và regressions** nhờ checklist và “cạm bẫy” đã biết.

## Vai trò của từng nơi

| Nơi                          | Mục đích                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `instructment.md` (file này) | Tổng quan stack, cấu trúc, lệnh, bẫy thường gặp, checklist trước khi merge.              |
| `.cursor/rules/*.mdc`        | Quy tắc Cursor theo phạm vi (`globs`) hoặc `alwaysApply: true` — ngắn, hành động cụ thể. |

**Gợi ý khi chat với AI:** `@` kèm file route/API đang sửa + file này nếu task chạm env/mock/router; tránh chỉ mô tả bằng lời mà không neo vào file thật.

---

## Stack & công cụ

- **Runtime UI**: React 19, Vite 6, TypeScript 5.
- **Định tuyến**: TanStack Router — file-based trong `src/app/routes/`.
- **Dữ liệu**: TanStack Query + `apiClient` (Axios) trong `src/lib/axios.ts`; type API sinh từ OpenAPI → `src/types/api.generated.ts`.
- **Form / schema**: react-hook-form, Zod, `@hookform/resolvers`.
- **State**: Zustand (`src/stores/`), XState khi có state machine.
- **UI**: Tailwind CSS v4, Radix, `lucide-react`, `recharts`, `sonner`.
- **Chất lượng**: ESLint, Prettier, Husky + lint-staged, Vitest.

---

## Cấu trúc mã nguồn

- `src/app/routes/` — route tree; **đổi URL = đổi file route**, không tự “đoán” path.
- `src/features/<domain>/` — domain: thường có `components/`, `api.ts`, đôi khi `mock/`.
- `src/components/` — dùng chung (icons, shell, …).
- `src/lib/` — axios, env mock, helpers.
- `src/stores/` — auth và store toàn cục.

Ưu tiên **mở rộng feature sẵn có** và **bắt chước pattern cùng thư mục** (import, tách component, cách gọi API).

---

## Lệnh thường dùng

```bash
npm run dev           # Dev server
npm run build         # Bắt lỗi production (tree-shake, import, …)
npm run typecheck     # BẮT BUỘC chạy trước khi coi task xong
npm run lint
npm run test
npm run codegen       # Cần VITE_API_URL + backend có /openapi.json
npm run codegen:local # openapi.json trong repo
```

**Quy ước:** Sau thay đổi đáng kể, tối thiểu `typecheck`; trước merge nên có `lint` (và `build` nếu đụng import/env).

---

## Mock API vs backend thật (dễ gây “tưởng xong mà vẫn lỗi”)

- **`VITE_USE_MOCK_API`**: chỉ `import.meta.env.VITE_USE_MOCK_API === 'true'` mới coi là bật mock (xem `src/lib/mockEnv.ts`). Chuỗi khác / thiếu biến → **không** vào nhánh mock trong code.
- **`VITE_API_URL`**: `apiClient` dùng làm `baseURL`. Thiếu hoặc sai origin → 404/CORS/network ngay cả khi UI “đúng”.
- **401 + mock token**: Trong `src/lib/axios.ts`, khi mock bật và token bắt đầu bằng `mock.`, interceptor có thể **không** logout/redirect như phiên thật. Đừng copy logic 401 sang chỗ khác mà làm mất hành vi này.
- **Gỡ mock toàn dự án**: Làm theo `.cursor/rules/backend-mock-removal.mdc`; sau đó `rg "isMockApiEnabled|MOCK_|mock/" src` để không sót.

**Anti-vibe:** Đừng thêm fetch `fetch('/api/...')` tường minh nếu cả feature đang dùng `apiClient` + Query — sẽ lệch base URL, header Bearer, và xử lý lỗi.

---

## TanStack Router — bẫy thường gặp

- Route được định nghĩa bằng **cấu trúc file**; tên file/route id có thể khác “URL đoán được”. Khi thêm màn: **mở route cha/lanh cận** (ví dụ `_protected/route.tsx`) và làm theo pattern hiện có (layout, `beforeLoad`, redirect).
- `Link` / `navigate`: dùng **path đã tồn tại trong tree**; sai path → blank hoặc 404 tại runtime.
- Params (`$examId`, …): đọc đúng hook/search params theo convention file đang dùng trong feature đó; không trộn string literal magic khắp component nếu đã có helper/route type.

---

## TanStack Query — tránh bug dữ liệu stale / double fetch

- **`queryKey`**: Luôn gồm tham số thật sự ảnh hưởng response (id, filter, page). Key quá rộng hoặc quá hẹp đều gây cache sai.
- **Invalidation:** Sau mutation (create/update/delete), **invalidate** hoặc **setQueryData** tương ứng; vibe-only UI update local state mà quên cache → sau navigate lại thấy “mất thay đổi”.
- **Error UI:** Dùng `isError`, `error` từ query; đừng chỉ `isLoading` — lỗi mạng im lặng làm người dùng tưởng không có dữ liệu.

---

## OpenAPI & `api.generated.ts`

- **Codegen** chỉ đúng khi `openapi.json` (backend hoặc file local) **khớp** API đang chạy. Sinh type cũ + backend mới → lỗi lúc build hoặc lỗi lúc chạy.
- **Không** sửa tay file generated để “cho qua compile”; sửa contract hoặc chạy lại codegen.
- Endpoint chưa có trong OpenAPI: có thể cần type tạm ở feature — nhưng ghi chú rõ TODO và hạn chế `any`.

---

## TypeScript & ESLint — dấu hiệu đang “vá vibe”

- Tránh `as any` / `// @ts-expect-error` rải rác để ship nhanh; nếu bắt buộc, **một chỗ**, kèm lý do và issue/TODO.
- `import type` cho type-only khi phù hợp; tránh cycle import giữa `api.ts` ↔ component — thường tách type hoặc hook ra file nhỏ.
- Chạy `typecheck` sớm; đừng chỉ dựa vào IDE đang không báo đỏ.

---

## UI / UX — đồng nhất sản phẩm

- Ưu tiên **component và spacing** giống màn cùng role (HR, Manager, …): màu, `Card`, typography Tailwind đã dùng.
- **Copy tiếng Việt:** thống nhất văn phòng (ví dụ “Đăng nhập”, “Quay lại”) — tránh chỗ tiếng Anh chỗ tiếng Việt cùng một flow trừ khi thuật ngữ cố định.
- **Toast:** `sonner` đã có trong dependency; kiểm tra feature hiện tại đang báo lỗi/thành công thế nào rồi làm tương tự.

---

## Bảo mật & dữ liệu nhạy cảm

- Không commit secret, token, `.env` thật; chỉ `.env.example` mô tả biến.
- Không log `accessToken` / payload cá nhân ra `console` trong code lâu dài.

---

## Checklist trước khi coi task “xong” (chất lượng tối thiểu)

1. **Đúng env:** `VITE_API_URL`, `VITE_USE_MOCK_API` hiểu rõ cho kịch bản đang test.
2. **`npm run typecheck`** pass.
3. Luồng chạm vào Backend: **login + một hành động** trên màn vừa sửa (không chỉ nhìn UI tĩnh).
4. **401 / empty / error:** có hành vi rõ (message hoặc redirect), không trang trắng không lời giải thích.
5. **Route mới / link mới:** bấm thử từ nơi gọi tới; không 404.
6. Nếu đụng contract API: đã **codegen** và import type đúng.

---

## Khi AI (agent) sinh mã — nên kiểm chứng

- File có thật trong repo hay không (path `features/...`, tên export).
- Có import không tồn tại hoặc API method không có trên `apiClient`/generated types.
- Có logic **trùng** với `axios` interceptor / `getApiErrorMessage` — ưu tiên tái sử dụng thay vì nhân đôi.
- Diff có **phình** sang file không liên quan không — reject hoặc revert phần không cần.

---

## Gợi ý tách rule `.mdc` trong `.cursor/rules/`

Giữ từng file **ngắn**, một chủ đề (skill create-rule):

- `react-tsx-patterns.mdc` — `globs: **/*.tsx`
- `api-tanstack-query.mdc` — `globs: src/**/{api.ts,*Api*.ts}`
- Copy UI tiếng Việt / role-based — nếu team muốn siết wording

---

## Tham chiếu nhanh file “neo”

| Chủ đề            | File                                     |
| ----------------- | ---------------------------------------- |
| HTTP client, 401  | `src/lib/axios.ts`                       |
| Cờ mock           | `src/lib/mockEnv.ts`                     |
| Gỡ mock checklist | `.cursor/rules/backend-mock-removal.mdc` |

---

_Cập nhật khi đổi auth, OpenAPI, hoặc cấu trúc route lớn. Nội dung dài ở đây là cố ý để giảm lỗi khi làm nhanh; phần bắt buộc cho Cursor vẫn nên lặp lại dạng `.mdc` nếu muốn agent luôn nạp._

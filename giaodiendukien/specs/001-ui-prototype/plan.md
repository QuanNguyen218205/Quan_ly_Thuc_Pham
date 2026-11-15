---
status: APPROVED # User explicitly approved Thiet_ke_cau_truc_giao_dien_du_kien.md and commissioned Prototype implementation
version: 1.0.0
selected_tech_stack: "Option A: npm Workspaces + Vite + React 18 + TypeScript + shared-sim Engine (Recommended)"
selected_ui_concept: "Concept A: Culinary Slate Workbench & Fresh Pantry (Operate Mode)"
last_updated: "2026-11-11"
---

# Implementation Plan: Household Food Management Client–Server UI Prototype

## 1. Executive Summary & Architecture Overview

Triển khai hoàn chỉnh giao diện UI Prototype cho hệ thống **Quản lý Thực phẩm Gia đình & Đề xuất FEFO (Client–Server)** gồm hai ứng dụng có thể **chạy và trình diễn độc lập** trên trình duyệt:
1. **`Quan_ly_Thuc_Pham/desktop-server/`**: Ứng dụng Desktop Server Workbench (`14` bề mặt `DSK-01`..`DSK-07`, `DSK-03-D`, `DSK-M01`..`DSK-M06`).
2. **`Quan_ly_Thuc_Pham/mobile-client/`**: Ứng dụng Mobile Client Touch Companion (`13` bề mặt `MOB-00`..`MOB-07`, `MOB-S01`..`MOB-S05`).
3. **`Quan_ly_Thuc_Pham/shared-sim/`**: Thư viện TypeScript thuần (zero DOM/React) chứa toàn bộ Domain Entities, Seed Mock Data chuẩn theo `food_management.sql`, thuật toán FEFO+FIFO (`1.1`–`1.6`), Alert Engine (`view_alerts`), Inventory Stored-Procedure Simulation (`sp_use_food` + Trigger log), AI Vision Scan Presets, và Simulated Client–Server Transport (`BroadcastChannel` khi cùng origin + in-process LocalServer fallback khi chạy độc lập).

```text
Quan_ly_Thuc_Pham/
├── docs/                          # (Read-only) Tài liệu đặc tả gốc
├── package.json                   # npm workspaces root + script dev:desktop / dev:mobile / test
├── shared-sim/                    # @food-mgmt/shared-sim (Domain, Seed Data, FEFO Engine, Mock Server)
│   └── src/
│       ├── domain/                # Types, Enums, Errors, Protocol Contracts
│       ├── data/                  # SQL-faithful Seed Dataset, Recipes, AI Presets
│       ├── engine/                # fefo-engine, alerts-engine, inventory-service, analytics-service
│       └── protocol/              # simulated-server, client-transport (BroadcastChannel + LocalBus)
├── desktop-server/                # @food-mgmt/desktop-server (Vite + React + TS, port 5173)
│   └── src/
│       ├── styles/                # Desktop Workbench CSS tokens
│       ├── components/            # WindowChrome, Sidebar, Drawer, Charts, Modals, TrayPopover
│       ├── screens/               # DSK-01 .. DSK-07
│       └── state/                 # Desktop server-host adapter hooks
└── mobile-client/                 # @food-mgmt/mobile-client (Vite + React + TS, port 5174)
    └── src/
        ├── styles/                # Mobile Pantry CSS tokens
        ├── components/            # PhoneShell, TopBar, BottomNav, Toast, FoodCard, Sheets (MOB-S01..S05)
        ├── screens/               # MOB-00 .. MOB-07
        └── state/                 # Mobile network-aware client adapter hooks
```

---

## 2. Tech Stack Comparison & Technical Baseline Lock

### 2.1. Tech Stack Options
- **Option A (Recommended & Selected): npm Workspaces + React 18 + TypeScript 5 + Vite + Custom CSS Variables + `lucide-react` + SVG DataViz + Vitest/Playwright**
  - *Strengths*: Hai ứng dụng (`desktop-server`, `mobile-client`) build & chạy độc lập hoàn toàn (`npm run dev:desktop`, `npm run dev:mobile`), chia sẻ `shared-sim` type-safe 100%, không lẫn Tailwind v3/v4 breaking config, biểu đồ SVG nhẹ kiểm soát chặt bảng màu từ `dataviz` (zero purple, crisp WCAG contrast), dễ test bằng Vitest + headless Chrome/Playwright.
  - *Trade-offs*: Cần viết module CSS tokens gọn gàng thay vì utility classes; tránh hoàn toàn sự cố xung đột CSS giữa Desktop & Mobile.
- **Option B: Vanilla HTML/CSS/JS tĩnh ghép 1 trang HTML**
  - *Trade-offs*: Dễ phình to thành một file monolithic; khó tách hai ứng dụng chạy độc lập và khó kiểm thử unit/component tự động.
- **Option C: Electron + React Native / Expo**
  - *Trade-offs*: Yêu cầu toolchain native nặng, tốn dung lượng cài đặt không phù hợp mục tiêu Prototype trình diễn nhanh trong repo web trống.

### 2.2. Technical Baseline & Dependency Lock

| Thành phần | Công nghệ / Thư viện | Phiên bản / Chuẩn | Trạng thái | Ghi chú & Ràng buộc cho Subagents |
|---|---|---|---|---|
| Runtime / Pkg Manager | Node.js + npm Workspaces | Node `24.x`, npm `11.x` | `Required` | Không dùng yarn/pnpm/bun |
| UI Framework | `react`, `react-dom` | `^18.3.1` | `Required` | Tách logic khỏi UI components |
| Language & Build | `typescript`, `vite`, `@vitejs/plugin-react` | TS `^5.6`, Vite `^6.0` | `Required` | Bật `strict: true`; 2 Vite config độc lập (`5173`, `5174`) |
| Iconography | `lucide-react` | `^0.460.0` | `Required` | Thống nhất icon vector sắc nét cả 2 app |
| Styling & Charts | CSS Custom Properties + Custom Responsive SVG | Native CSS + `dataviz` tokens | `Required` | Tuyệt đối không dùng violet/lavender làm accent; font `Be Vietnam Pro` + `JetBrains Mono` |
| Unit / Integration Test | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` | `^2.1.x` | `Required` | Chỉ `qa-test-engineer` viết test dưới `tests/` hoặc `__tests__/` |
| Browser E2E Verification | `playwright` (dùng system `chrome.exe` hoặc `msedge.exe`) | Installed system Chrome | `Allowed` | Kiểm tra viewport `1440×900` và `390×844` không tải thêm binary nặng |
| Real Backend / DB / Auth / UI Bloats | Express, Socket.io server, MySQL driver, MUI, AntD, Tailwind, Chart.js | Any | `Prohibited` | **CẤM** tạo backend thật, DB thật hay tự ý cài thư viện ngoài baseline |

---

## 3. UI/UX Concepts & Aesthetic Proposals

### Concept A: "Culinary Slate Workbench & Fresh Pantry" (Selected — `Operate` Mode)
- **Design Mode**: `Operate` (Cân bằng giữa bảng dữ liệu mật độ cao kiểu ứng dụng máy tính Desktop và thẻ thao tác một chạm ấm áp cho bếp trên Mobile).
- **Visual World & Mood**: Máy trạm vận hành kho bếp thông minh ban ngày — sạch sẽ, chính xác, phân cấp trạng thái sinh học rõ ràng (Tươi xanh ngọc -> Sắp hết hổ phách -> Quá hạn đỏ san hô), mang lại cảm giác tin cậy ngay lập tức như phần mềm quản trị nội bộ kết hợp trợ lý nhà bếp.
- **Color Palette**:
  - Desktop Canvas: `#F4F6F8`, Card/Table Surface `#FFFFFF`, Sidebar Rail `#111827` (Slate Charcoal), Border `#E2E8F0`.
  - Mobile Canvas: `#FAF9F6` (Warm Pantry Stone), Card `#FFFFFF`, Border `#E7E5E4`.
  - Primary Accent: `#0F766E` (Botanical Deep Teal) & Hover `#115E59`.
  - Semantic Status: Fresh `#15803D` (`#DCFCE7` bg), Urgent `<= ngưỡng` `#B45309` (`#FEF3C7` bg), Critical/Expired `#B91C1C` (`#FEE2E2` bg), Offline/Info `#1D4ED8` / `#475569`.
  - Zero violet/purple/neon gradients anywhere.
- **Typography**: UI & Headings `Be Vietnam Pro` (`500`, `600`, `700`), Tabular Data / Lot Codes / Timestamps / IP:Port `JetBrains Mono` (`tabular-nums`). Desktop base `13px`, Mobile base `15px` (`>= 44px` touch targets).
- **Justification**: Phù hợp tuyệt đối cả 2 nền tảng: Desktop đạt chuẩn công cụ dữ liệu gọn gàng theo `34-desktop-app-design`, Mobile tối ưu sử dụng trong bếp với tương phản cao trên màn hình điện thoại theo `10-mobile-engineer`.

### Concept B: "Midnight Kitchen Ops Terminal" (Rejected)
- **Visual World & Mood**: Giao diện tối toàn phần `#0B1120` giống hệ thống giám sát mạng NOC.
- **Reason Rejected**: Độ tương phản thấp trong môi trường ánh sáng bếp ban ngày trên điện thoại và tạo cảm giác xa lạ với ngữ cảnh thực phẩm gia đình.

### Concept C: "Warm Ceramic Cookbook" (Rejected)
- **Visual World & Mood**: Nền giấy báo kem ấm kết hợp serif lớn và card bo tròn dày.
- **Reason Rejected**: Quá thiên hướng tạp chí (`Read`/`Persuade`), lãng phí không gian chiều ngang của màn hình Desktop Server khi cần bảng kho 8+ cột và cửa sổ Server Monitor Console.

---

## 4. Expected Screen Wireframes (ASCII Wireframes)

### 4.1. Desktop Server Main Window + Drawer (`DSK-01`..`DSK-07`, `DSK-03-D`, `DSK-M06`)
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [App Icon] Quản lý Thực phẩm Gia đình — SERVER  │ Ngày HT: 2026-11-11 [-1d][+1d][+3d]   │
│            Prototype Giả lập Client–Server       │ ● Listening 192.168.1.10:8080 [Tray]│
├──────────────────┬───────────────────────────────────────────────────┬─────────────────┤
│ NAV RAIL (228px) │ WORKSPACE (Fluid: DSK-01 .. DSK-07)               │ DSK-03-D DRAWER │
│ ▸ Tổng quan      │ [DSK-01] 4 KPI Cards | SVG Trend & Area Charts    │ (360px slide-in)│
│ ▸ Đề xuất FEFO   │          Top FEFO List + Live Server Console      │ Thông tin lô    │
│ ▸ Kho thực phẩm  │ [DSK-02] Bảng/Thẻ FEFO + Cards Món ăn (DSK-M03)   │ 12 trường + Log │
│ ▸ Cảnh báo  [!]  │ [DSK-03] Search + 5 Bộ lọc + Bảng tồn kho + [+Mới] │ của riêng lô    │
│ ▸ Nhật ký kho    │ [DSK-04] Tab 1 Quá/Cận hạn | Tab 2 Tồn thấp & Mua │ [Dùng][Sửa][Hủy]│
│ ── Quản trị ──── │ [DSK-05] Bộ lọc ngày/loại + Bảng Audit Trail      │                 │
│ ▸ Danh mục       │ [DSK-06] 4 Tabs (Loại | Đơn vị | Vị trí | Món ăn) │                 │
│ ▸ Cài đặt        │ [DSK-07] Tab 1 Nghiệp vụ/FEFO | Tab 2 LAN & QR    │                 │
├──────────────────┴───────────────────────────────────────────────────┴─────────────────┤
│ CSDL Giả lập (MySQL Schema) | Clients: 2 Active | Cảnh báo: 5 | Múi giờ: Asia/HCMC     │
└────────────────────────────────────────────────────────────────────────────────────────┘
Modal Overlay Surfaces:
  - DSK-M01: Thêm / Sửa Thực phẩm 12 trường (IN01–IN12) + Vùng Quét AI Vision + Check trùng tên/mã
  - DSK-M02: Biến động Kho 4 chế độ (Xuất dùng / Nhập thêm / Kiểm kê / Đổi vị trí 2 cấp)
  - DSK-M03: Chi tiết Món ăn Gợi ý & nguyên liệu sẵn có / thiếu
  - DSK-M04: Xác nhận Thanh lý / Xóa mềm (cảnh báo khi SL > 0, giữ Audit Log)
  - DSK-M05: Thêm / Sửa Danh mục nền (Loại / Đơn vị / Vị trí 2 cấp / Công thức món)
  - DSK-M06: System Tray Popover (thu gọn Desktop nhưng Listener & Cảnh báo vẫn chạy nền)
```

### 4.2. Mobile Client App Shell & Sheets (`MOB-00`..`MOB-07`, `MOB-S01`..`MOB-S05`)
```text
    Phone Frame (max-w 430px on desktop preview, full-bleed <=480px)
┌──────────────────────────────────────────┐
│ [←/Logo] Kho Bếp Gia Đình   [● LAN] [⟳] │ ← Top App Bar + Connection Pill + Sync
├──────────────────────────────────────────┤
│ [Banner Offline Chỉ Xem / Cảnh báo Khẩn] │ ← Contextual Banner (khi rớt mạng/khẩn)
│                                          │
│ [MOB-00] IP:Port + QR Scan giả lập + Ping│
│ [MOB-01] FEFO Priority Cards + Món ăn    │
│ [MOB-02] Search + Quick Chips + Cards    │
│ [MOB-03] Detail 12 trường + Lot Log      │
│ [MOB-04] Recipe Cards + Chế độ Nấu/Trừ   │
│ [MOB-05] Segmented: Hạn dùng | Cần mua   │
│ [MOB-06] Form 12 trường + AI + Preserved │
│ [MOB-07] Mini Charts + Logs + Catalogs   │
│                                  [ + ]   │ ← Floating Action Button (FAB)
├──────────────────────────────────────────┤
│  Hôm nay  │   Kho   │ Cảnh báo │  Khác   │ ← 4-Tab Bottom Navigation Bar
└──────────────────────────────────────────┘
Bottom Sheets & Dialogs:
  - MOB-S01: Quick Stepper (Xuất dùng / Nhập thêm / Kiểm kê điều chỉnh)
  - MOB-S02: Filter Sheet 5 tiêu chí (Loại, Khu vực, Trạng thái, Hạn dùng, Từ khóa)
  - MOB-S03: Move Location 2 cấp (Trong/Ngoài tủ -> Ngăn chi tiết)
  - MOB-S04: AI Vision Camera/Gallery Simulation -> Điền sẵn MOB-06
  - MOB-S05: Soft Delete / Thanh lý Confirmation Dialog
```

---

## 5. Phased Implementation Roadmap & Subagent Assignments

| Phase | Mục tiêu & Deliverables | File Write Scope | Subagent phụ trách |
|---|---|---|---|
| **Phase 1A** | CSS Design Tokens (`desktop-server/src/styles/tokens.css`, `mobile-client/src/styles/tokens.css`), Chart palette check (`dataviz`), & Component Contract | `desktop-server/src/styles/**`, `mobile-client/src/styles/**` | `ui-ux-designer` |
| **Phase 1B** | Root Workspaces, `shared-sim` domain models, SQL-faithful mock dataset, FEFO+FIFO Engine, Alerts Engine, Inventory Service, AI Scanner Sim & Client–Server Transport | `Quan_ly_Thuc_Pham/package.json`, `Quan_ly_Thuc_Pham/shared-sim/**`, scaffold `package.json`/`vite.config.ts`/`tsconfig.json` | `frontend-engineer` (#1) |
| **Phase 2A** | Toàn bộ 14 bề mặt Desktop Server (`DSK-01`..`DSK-07`, `DSK-03-D`, `DSK-M01`..`DSK-M06`) + Server Monitor + Time Simulation Bar | `Quan_ly_Thuc_Pham/desktop-server/src/**` (trừ `styles/tokens.css`) | `frontend-engineer` (#2) |
| **Phase 2B** | Toàn bộ 13 bề mặt Mobile Client (`MOB-00`..`MOB-07`, `MOB-S01`..`MOB-S05`) + Offline/Error simulation + Form preservation | `Quan_ly_Thuc_Pham/mobile-client/src/**` (trừ `styles/tokens.css`) | `frontend-engineer` (#3) |
| **Phase 3** | Integration Check (Main Agent) -> Vitest Unit/Integration + Playwright Real-Browser E2E Tests across all 27 screens, flows & viewports (`1440×900`, `390×844`) | `Quan_ly_Thuc_Pham/tests/**` | `qa-test-engineer` |
| **Phase 4** | Read-Only Code & UX Audit -> Convergence (`speckit-converge`) -> Final Fixes & Verification | Read-Only Audit + Targeted Fixes | `code-reviewer` + Main Agent |

---

## 6. Functional Traceability Matrix (Ma trận Đối soát Chức năng)

Ánh xạ **100% (87/87)** mã chức năng nguyên tử từ `specs/001-ui-prototype/spec.md`:

| Atomic IDs | Nhóm chức năng | Phase | File / Module dự kiến | Subagent |
|---|---|---|---|---|
| `1.1.1`–`1.1.5` | Xác định thực phẩm đủ điều kiện tồn kho | P1B, P2A, P2B | `shared-sim/src/engine/fefo-engine.ts`, `desktop-server/src/screens/FefoScreen.tsx`, `mobile-client/src/screens/HomeFefoScreen.tsx` | `frontend-engineer` #1, #2, #3 |
| `1.2.1`–`1.2.5` | Tính HSD, phát hiện quá hạn, tách & phân loại | P1B, P2A, P2B | `shared-sim/src/engine/fefo-engine.ts`, `shared-sim/src/engine/alerts-engine.ts` | `frontend-engineer` #1, #2, #3 |
| `1.3.1`–`1.3.5` | Sắp xếp FEFO + FIFO cùng hạn + mức ưu tiên | P1B, P2A, P2B | `shared-sim/src/engine/fefo-engine.ts`, `DSK-02`, `MOB-01` | `frontend-engineer` #1, #2, #3 |
| `1.4.1`–`1.4.5` | Sinh lý do, gợi ý món ăn, công thức, dùng nhanh | P1B, P2A, P2B | `shared-sim/src/engine/fefo-engine.ts`, `DSK-M03`, `MOB-04`, `MOB-S01` | `frontend-engineer` #1, #2, #3 |
| `1.5.1`–`1.5.5` | Tự động tính lại FEFO khi biến động & đổi ngày | P1B, P2A, P2B | `shared-sim/src/protocol/simulated-server.ts`, `TimeSimBar` | `frontend-engineer` #1, #2, #3 |
| `2.1.1`–`2.1.7` | Form 12 trường Thêm/Sửa, validate, trùng mã/tên, ghép lô | P1B, P2A, P2B | `shared-sim/src/engine/inventory-service.ts`, `DSK-M01`, `MOB-06` | `frontend-engineer` #1, #2, #3 |
| `2.2.1`–`2.2.4` | Quét ảnh AI Vision giả lập & fallback nhập tay | P1B, P2A, P2B | `shared-sim/src/data/ai-scan-presets.ts`, `DSK-M01`, `MOB-S04` | `frontend-engineer` #1, #2, #3 |
| `2.3.1`–`2.3.8` | Xuất dùng chống âm kho, nhập thêm, kiểm kê, đổi vị trí, thanh lý `Đã hủy`, Audit Log | P1B, P2A, P2B | `shared-sim/src/engine/inventory-service.ts`, `DSK-M02`, `DSK-M04`, `MOB-S01`, `MOB-S03`, `MOB-S05`, `DSK-05` | `frontend-engineer` #1, #2, #3 |
| `2.4.1`–`2.4.8` | Bảng/thẻ kho, chi tiết 12 trường + log lô, tìm kiếm & lọc 5 tiêu chí, reset lọc | P1B, P2A, P2B | `shared-sim/src/engine/inventory-service.ts`, `DSK-03`, `DSK-03-D`, `MOB-02`, `MOB-03`, `MOB-S02` | `frontend-engineer` #1, #2, #3 |
| `2.5.1`–`2.5.9` | CRUD Loại, Đơn vị, Vị trí 2 cấp, Công thức (Desktop) & đồng bộ xem Mobile | P1B, P2A, P2B | `DSK-06`, `DSK-M05`, `MOB-07` | `frontend-engineer` #1, #2, #3 |
| `3.1.1`–`3.1.5` | Cảnh báo kép Hạn dùng & Tồn thấp + Danh sách Cần mua + Badge | P1B, P2A, P2B | `shared-sim/src/engine/alerts-engine.ts`, `DSK-04`, `MOB-05` | `frontend-engineer` #1, #2, #3 |
| `3.2.1`–`3.2.5` | 4 KPI, biểu đồ xu hướng & khu vực, thống kê Mobile, lọc Audit Log | P1A, P1B, P2A, P2B | `shared-sim/src/engine/analytics-service.ts`, `DSK-01`, `DSK-05`, `MOB-07` | `ui-ux-designer`, `frontend-engineer` #1, #2, #3 |
| `3.3.1`–`3.3.4` | Cài đặt múi giờ, ngày hệ thống, ngưỡng cảnh báo, mức FEFO, cụm `-1d/+1d/+3d/+7d` | P1B, P2A, P2B | `DSK-07`, `TimeSimBar`, `MOB-01`, `MOB-07` | `frontend-engineer` #1, #2, #3 |
| `4.1.1`–`4.1.6` | Bật/tắt Server Listener, IP:Port/QR, danh sách Clients, ngắt kết nối, Tray `DSK-M06`, Log mạng | P1B, P2A | `shared-sim/src/protocol/simulated-server.ts`, `DSK-01`, `DSK-07`, `DSK-M06` | `frontend-engineer` #1, #2 |
| `4.2.1`–`4.2.6` | Kết nối `MOB-00`, Ping/Handshake, nhận sự kiện đẩy, Offline Read-Only, Giữ Form, Báo lỗi trung thực | P1B, P2B | `shared-sim/src/protocol/client-transport.ts`, `MOB-00`, `MOB-01`..`MOB-07` | `frontend-engineer` #1, #3 |

**Số chức năng chưa phân bổ**: **0** (`87/87` mapped).

---

## 7. Lightweight Change & Baseline Control Rule
Mọi thay đổi về tech stack, hợp đồng giao thức Client–Server hoặc danh sách màn hình phải được cập nhật vào `specs/001-ui-prototype/spec.md` và `plan.md` trước khi sửa mã nguồn.

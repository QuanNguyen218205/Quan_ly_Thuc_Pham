# Tasks: Interactive Client–Server UI Prototype — Quản lý Thực phẩm Gia đình

**Plan Reference**: `specs/001-ui-prototype/plan.md`  
**Spec Reference**: `specs/001-ui-prototype/spec.md`

---

## Phase 1: Design System Tokens & Core Simulation Engine (`@ui-ux-designer` + `@frontend-engineer` #1)

### Phase 1A — Design System Tokens & Visual Craft (`@ui-ux-designer`)
- [x] T001 [P] Author Desktop Server Workbench CSS tokens and base typography/table/badge/chrome variables in `Quan_ly_Thuc_Pham/desktop-server/src/styles/tokens.css` (Operate mode, zero violet, `Be Vietnam Pro` + `JetBrains Mono`, 13px workbench scale)
- [x] T002 [P] Author Mobile Client Pantry CSS tokens, touch targets (`>= 44px`), safe-area bottom nav & sheet styles in `Quan_ly_Thuc_Pham/mobile-client/src/styles/tokens.css`
- [x] T003 [P] Validate categorical and semantic data visualization palette for Desktop/Mobile SVG charts against WCAG contrast & `dataviz` rules and export token manifest note for frontend engineers

### Phase 1B — Workspaces & `shared-sim` Engine (`@frontend-engineer` #1)
- [x] T004 Setup `Quan_ly_Thuc_Pham/package.json` npm workspaces and package scaffolds (`shared-sim`, `desktop-server`, `mobile-client`) including Vite (`5173`/`5174`), TypeScript strict configs, and shared `.gitignore` [NFR-04]
- [x] T005 Define SQL-faithful domain types, enums (`Đang sử dụng`/`Đã hết`/`Đã hủy`, `Nhập thêm`/`Sử dụng`/`Điều chỉnh`/`Vứt hủy`, `Trong tủ lạnh`/`Ngoài tủ lạnh`), 12-field form payload, 5-criteria filter, and 10 Client–Server protocol message interfaces in `Quan_ly_Thuc_Pham/shared-sim/src/domain/` (`food-entities.ts`, `protocol-contracts.ts`) [2.1.1, 4.2.1]
- [x] T006 Author realistic Vietnamese seed dataset matching `food_management.sql` (`7` categories, `8` units, `8` storage locations, `3` settings + FEFO threshold defaults, `>=14` foods/food_items spanning expired/critical/urgent/safe/FIFO-ties/low-stock/empty/cancelled, `inventory_transactions`, `6+` recipes, and AI vision sample presets) in `Quan_ly_Thuc_Pham/shared-sim/src/data/sql-seed-dataset.ts` and `ai-scan-presets.ts` [1.3.3, 2.2.1, 2.5.1–2.5.8]
- [x] T007 Implement FEFO+FIFO recommendation and recipe-matching engine (`1.1.1`–`1.5.5`) in `Quan_ly_Thuc_Pham/shared-sim/src/engine/fefo-recommender.ts`
- [x] T008 Implement dual Alerts (`view_alerts` expiry & low-stock shopping list) and Analytics KPI/Chart aggregation engines (`3.1.1`–`3.2.4`) in `Quan_ly_Thuc_Pham/shared-sim/src/engine/alerts-calculator.ts` and `analytics-aggregator.ts`
- [x] T009 Implement Inventory & Catalog service (`sp_use_food` underflow check, `RESTOCK_FOOD`, `ADJUST_FOOD`, `MOVE_LOCATION`, 12-field validation, duplicate `food_code` error & duplicate `food_name` batch merge, soft-delete `Đã hủy`, CRUD constraint checks, 5-criteria search/filter, Time Simulation offset `-1d/+1d/+3d/+7d`) (`2.1.2`–`2.5.9`, `3.3.1`–`3.3.4`) in `Quan_ly_Thuc_Pham/shared-sim/src/engine/inventory-ledger.ts`
- [x] T010 Implement Simulated Client–Server protocol engine (`PING/HANDSHAKE`, 10 message handlers, Server Listener Start/Stop, DB Error & Network Latency/Timeout/Conflict injectors, Connected Clients roster, Request/Response packet trace log, `BroadcastChannel` + `localStorage` cross-window sync + standalone local server fallback) (`4.1.1`–`4.2.6`) in `Quan_ly_Thuc_Pham/shared-sim/src/protocol/simulated-server-node.ts` and `client-transport.ts`

---

## Phase 2: Dual Application UI Implementation (`@frontend-engineer` #2 & #3 in parallel)

### Phase 2A — Desktop Server Application (`@frontend-engineer` #2, `Quan_ly_Thuc_Pham/desktop-server/src/**`)
- [x] T011 [P] [US3] Build Desktop Window Shell (Title/Listener status bar, Time Simulation Bar `-1d/+1d/+3d/+7d/Reset`, 228px Navigation Sidebar with urgent alert badge, bottom Status Bar with Prototype disclaimer) and state provider in `desktop-server/src/components/WindowShell.tsx` and `desktop-server/src/state/useDesktopServer.ts` [3.3.4, 4.1.1]
- [x] T012 [P] [US3] Implement `DSK-M06` System Tray Popover allowing Desktop UI minimization to tray while simulated Background Server continues serving requests and firing desktop notifications in `desktop-server/src/components/SystemTrayPopover.tsx` [4.1.5]
- [x] T013 [P] [US3] Implement `DSK-01` Tổng quan & Giám sát Server (4 KPI cards, responsive SVG Consumption Trend & Cold/Ambient Area Distribution charts, Top urgent FEFO quick table, Server Monitor Console with Start/Stop Listener, QR pairing modal trigger, Client disconnect, Fault-injection toggles & Packet Log) in `desktop-server/src/screens/DashboardServerScreen.tsx` and `desktop-server/src/components/AnalyticsCharts.tsx` [3.2.1–3.2.3, 4.1.1–4.1.6]
- [x] T014 [P] [US1] Implement `DSK-02` Đề xuất Thực phẩm Ưu tiên (FEFO) & Gợi ý Món ăn + `DSK-M03` Recipe Detail Modal (priority grouping `Cao`/`Trung bình`/`Thấp`, FIFO badge, ready/missing ingredients, Quick-Use button) in `desktop-server/src/screens/FefoRecipesScreen.tsx` and `desktop-server/src/components/RecipeDetailModal.tsx` [1.1.1–1.5.5]
- [x] T015 [P] [US2] Implement `DSK-03` Quản lý Thực phẩm, Tồn kho & Lọc 5 tiêu chí + `DSK-03-D` Slide-in Detail Drawer (12+ fields + lot-specific transactions) + Loading/Empty/DB Error states in `desktop-server/src/screens/InventoryScreen.tsx` and `desktop-server/src/components/FoodDetailDrawer.tsx` [2.4.1–2.4.8]
- [x] T016 [P] [US2] Implement Desktop Modals: `DSK-M01` (12-field Add/Edit + Simulated AI Vision preset/upload scanner + Duplicate food_code/food_name merge prompt), `DSK-M02` (4-mode Inventory Action: Use/Restock/Audit/2-level Location Move), and `DSK-M04` (Soft Delete / Liquidation confirmation preserving audit trail) in `desktop-server/src/components/FoodFormModal.tsx`, `InventoryActionModal.tsx`, and `LiquidateConfirmModal.tsx` [2.1.1–2.3.8]
- [x] T017 [P] [US4] Implement `DSK-04` Trung tâm Cảnh báo (Tab 1 Quá/Cận hạn + Tab 2 Dưới tồn tối thiểu & Danh sách Cần mua có Export/In giả lập) and `DSK-05` Nhật ký Biến động Kho (Audit Trail filterable + click to open `DSK-03-D`) in `desktop-server/src/screens/AlertsCenterScreen.tsx` and `AuditLogScreen.tsx` [3.1.1–3.1.5, 3.2.5]
- [x] T018 [P] [US5] Implement `DSK-06` Quản trị Danh mục Nền tảng & Công thức (4 tabs: Loại, Đơn vị, Vị trí 2 cấp, Công thức) + `DSK-M05` Form Modal with delete-constraint error feedback + `DSK-07` Cài đặt Hệ thống & Cấu hình Mạng Server (2 tabs: Business Params/Time Sim & LAN IP/Port/QR/Tray/Fault Demo) in `desktop-server/src/screens/CatalogsScreen.tsx`, `CatalogFormModal.tsx`, and `SettingsScreen.tsx` [2.5.1–2.5.8, 3.3.1–3.3.4, 4.1.2]

### Phase 2B — Mobile Client Application (`@frontend-engineer` #3, `Quan_ly_Thuc_Pham/mobile-client/src/**`)
- [x] T019 [P] [US3] Build Mobile App Shell (responsive phone viewport container for desktop demo + full-bleed `<480px`, Top App Bar with Connection Pill + Simulation Date badge + Manual Sync button, Contextual Offline Read-Only Banner & Urgent Banner, 4-tab Bottom Nav `[Hôm nay | Kho | Cảnh báo | Khác]`, FAB `+`, and Network-Aware Client State Provider with Simulated Disconnect/Timeout/Conflict test controls) in `mobile-client/src/components/MobileShell.tsx` and `mobile-client/src/state/useMobileClient.ts` [4.2.1–4.2.6]
- [x] T020 [P] [US3] Implement `MOB-00` Kết nối Máy chủ Desktop Server (LAN IP:Port form, simulated QR scan shortcut, Ping/Handshake test, clear connection error states `Server không phản hồi` / `Timeout` / `Sai mã ghép nối`) in `mobile-client/src/screens/ConnectServerScreen.tsx` [4.2.1–4.2.2]
- [x] T021 [P] [US1] Implement `MOB-01` Trang chủ — Hôm nay dùng gì? (Urgent summary banner, FEFO cards with priority & FIFO tags, Recipe recommendations carousel, Quick-Use button) and `MOB-04` Thực đơn Gợi ý Món ăn Tiêu thụ (with matched/missing ingredients & Cook-and-Deduct workflow) in `mobile-client/src/screens/HomeFefoScreen.tsx` and `RecipesMenuScreen.tsx` [1.1.1–1.5.5]
- [x] T022 [P] [US2] Implement `MOB-02` Kho Thực phẩm & Tủ lạnh (Live search bar, Quick filter chips, Food Cards grouped/badged, FAB `+`) + `MOB-S02` 5-Criteria Filter Bottom Sheet + `MOB-03` Chi tiết Lô hàng 12+ trường & Lịch sử Lô in `mobile-client/src/screens/MobileInventoryScreen.tsx`, `FilterBottomSheet.tsx`, and `FoodDetailScreen.tsx` [2.4.1–2.4.8]
- [x] T023 [P] [US2] Implement `MOB-06` Form Thêm/Sửa 12 trường với Duplicate Name merge/create dialog & Form Preservation khi mất mạng + `MOB-S04` AI Vision Camera/Gallery Simulation Sheet + `MOB-S01` Stepper Action Sheet (Use/Restock/Adjust) + `MOB-S03` 2-level Location Move Sheet + `MOB-S05` Soft Delete/Liquidation Dialog in `mobile-client/src/screens/FoodFormScreen.tsx` and `mobile-client/src/components/{AiScanSheet.tsx,StockActionSheet.tsx,MoveLocationSheet.tsx,LiquidateDialog.tsx}` [2.1.1–2.3.8, 4.2.5–4.2.6]
- [x] T024 [P] [US4] Implement `MOB-05` Trung tâm Cảnh báo & Cần mua bổ sung (2 Segments: Hạn dùng & Cần mua bổ sung với Quick Dùng/Hủy/Nhập thêm) and `MOB-07` Thống kê Rút gọn, Nhật ký gần đây, Tra cứu Danh mục từ Server, & Trạng thái Kết nối Server (nút chuyển sang `MOB-00` + mô phỏng mạng) in `mobile-client/src/screens/MobileAlertsScreen.tsx` and `MobileStatsSettingsScreen.tsx` [2.5.9, 3.1.1–3.1.5, 3.2.4, 4.2.1–4.2.4]

---

## Phase 3: Integration, Testing & Quality Gate (`Main Agent` + `@qa-test-engineer` + `@code-reviewer`)

- [x] T025 Central npm install, TypeScript check (`tsc --noEmit`), and independent Vite production builds for `shared-sim`, `desktop-server`, and `mobile-client` (`Main Agent`)
- [x] T026 Write and execute Vitest unit & integration test suite covering FEFO+FIFO sorting, expired exclusion, `sp_use_food` stock underflow rejection, 12-field & duplicate checks, 5-criteria filtering, Time Simulation `-1d/+1d/+3d/+7d`, and Client–Server failure/offline simulation in `Quan_ly_Thuc_Pham/tests/shared-sim.test.ts` and `ui-flows.test.tsx` (`@qa-test-engineer`) [SC-02, SC-03, SC-04]
- [x] T027 Write and execute Playwright real-browser acceptance test script using system Chrome checking all 14 Desktop surfaces (`1440×900`, `1280×720`) and all 13 Mobile surfaces (`390×844`), main user flows `D1`–`D5` + offline form preservation + zero console/overflow/SVG errors in `Quan_ly_Thuc_Pham/tests/run-playwright-e2e.mjs` (`@qa-test-engineer`) [SC-01, SC-05]
- [x] T028 Perform independent Read-Only Code & UX Review checking SOLID modularity, clean mock-data separation, Prototype honesty (no fake backend claims), zero Lorem Ipsum, and 100% alignment with `Thiet_ke_cau_truc_giao_dien_du_kien.md` (`@code-reviewer`)

---

## Phase 4: Remediation, Convergence & Final Acceptance (`Main Agent`)

- [x] T029 Fix all findings raised by `qa-test-engineer` and `code-reviewer`, then re-run full TypeScript, build, Vitest, and Playwright E2E checks after final edits
- [x] T030 Execute `/speckit-converge` audit against `specs/001-ui-prototype/spec.md`, `plan.md`, and `tasks.md` and compile final acceptance verification matrix for the user

# Changelog

All notable changes for the Household Food Management & FEFO Recommendation Client–Server UI Prototype are documented here.

## [1.0.0] - 2026-11-11

### Added
- **Shared Simulation Core (`@food-mgmt/shared-sim`)**:
  - SQL-faithful domain types & enums (`Đang sử dụng`, `Đã hết`, `Đã hủy`; `Nhập thêm`, `Sử dụng`, `Điều chỉnh`, `Vứt hủy`; `Trong tủ lạnh`, `Ngoài tủ lạnh`), 12-field form model (`IN01`–`IN12`), and 5-criteria search filter (`IN15`).
  - Seed Vietnamese pantry dataset (`7` categories, `8` units, `8` two-level locations, `15` foods, `16` food lots, `14` transactions, `7` recipes, `4` AI scan presets).
  - FEFO+FIFO recommender (excluding `DaysRemaining < 0` into dual expiry alerts), dual low-stock/shopping alert calculator, `sp_use_food` stock ledger + atomic `COOK_RECIPE` unit conversion, analytics aggregator, and simulated time travel (`-1d/+1d/+3d/+7d`).
  - Simulated Client–Server node & transport supporting `PING_HANDSHAKE`, all 10 protocol groups, `CONFLICT_STALE_STOCK`/`TIMEOUT`/`NETWORK_DROP`/`DB_ERROR` injectors, offline read-only cache, `localStorage` persistence, and same-origin `BroadcastChannel` sync.
- **Desktop Server Application (`@food-mgmt/desktop-server`, port `5173`)**:
  - Implemented all 14 approved Desktop surfaces: `DSK-01`..`DSK-07`, `DSK-03-D` Detail Drawer, `DSK-M01`..`DSK-M05` modals, and `DSK-M06` System Tray popover & minimized tray background mode.
- **Mobile Client Application (`@food-mgmt/mobile-client`, port `5174`)**:
  - Implemented all 13 approved Mobile surfaces: `MOB-00`..`MOB-07` screens and `MOB-S01`..`MOB-S05` bottom sheets/dialogs enforcing Offline Read-Only, `MOB-06` form preservation on failed saves, and touch-first pantry UX.
- **Verification & Governance**:
  - Spec Kit artifacts (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`, `ui-tokens-contract.md`, `ADR-001-ui-prototype-architecture.md`).
  - Vitest unit/integration tests (`tests/shared-sim.test.ts`, `tests/ui-flows.test.tsx`) and Playwright headless Chrome E2E verification (`tests/run-playwright-e2e.mjs`).

<!-- Sync Impact Report: Initial v1.0.0 constitution created for 001-ui-prototype -->

# Project Constitution: Hệ thống Quản lý Thực phẩm Gia đình (Client–Server UI Prototype)

**Version**: 1.0.0  
**Ratification Date**: 2026-11-11  
**Last Amended Date**: 2026-11-11  

## Core Governance Principles

### Principle I: Strict Prototype Simulation Honesty (Zero Backend Fakery)
This codebase implements an interactive UI Prototype demonstrating the Household Food Management Client–Server system (`Desktop Server` + `Mobile Client`). It MUST NOT deploy a real database server, real socket/REST backend, or external third-party API calls. Simulated Client–Server messaging, MariaDB schema state, stored procedure (`sp_use_food`), trigger (`trg_after_inventory_transaction`), and AI Vision recognition MUST operate deterministically in client-side TypeScript modules (`shared-sim`) and visibly indicate simulated prototype status when demonstrating network disconnects, timeouts, or conflicts.

### Principle II: Domain & Approved Specification Fidelity
All entity names, field constraints (`IN01`–`IN15`), status enums (`Đang sử dụng`, `Đã hết`, `Đã hủy`), action types (`Nhập thêm`, `Sử dụng`, `Điều chỉnh`, `Vứt hủy`), storage areas (`Trong tủ lạnh`, `Ngoài tủ lạnh`), FEFO+FIFO sorting rules, and all 27 approved UI surfaces (`DSK-01`..`DSK-07`, `DSK-03-D`, `DSK-M01`..`DSK-M06`, `MOB-00`..`MOB-07`, `MOB-S01`..`MOB-S05`) defined in `Thiet_ke_cau_truc_giao_dien_du_kien.md` MUST be implemented faithfully without inventing unauthorized business subsystems or using Lorem Ipsum placeholder copy.

### Principle III: Platform Authenticity & Functional Parity
Desktop Server MUST present an authentic desktop workbench (`Operate` mode, window chrome, dense data views, System Tray popover `DSK-M06`, background listener simulation) rather than a generic marketing website. Mobile Client MUST present a touch-first smartphone experience (480px mobile viewport, 4-tab Bottom Navigation, FAB, swipe/steppers, Bottom Sheets) with 100% consistent terminology and server-driven truth (Offline Read-Only on disconnect, Form Preservation on write failure, zero optimistic stock lies).

### Principle IV: Clean Separation & Independent Runnability
Domain models, SQL-faithful mock seed data, FEFO/Alert calculation engines, and Client–Server protocol simulation MUST reside cleanly inside `Quan_ly_Thuc_Pham/shared-sim/` separate from React presentation components. Both `Quan_ly_Thuc_Pham/desktop-server/` and `Quan_ly_Thuc_Pham/mobile-client/` MUST be runnable and demonstrable independently on their own dev servers and build targets, while seamlessly sharing simulation logic. No dumping-ground filenames (`utils`, `helpers`, `common`, `misc`) are permitted.

### Principle V: Verifiable Quality & Mandatory Role Separation
All business-critical engine logic (FEFO sorting, expiry filtering, stock deduction, search filters, Client–Server transport/error simulation) and real-browser UI journeys across Desktop and Mobile viewports MUST be verified by automated tests authored and executed by `qa-test-engineer`, and audited read-only by `code-reviewer`. Production source code MUST remain free of dead decorative controls and console runtime errors.

## Governance & Amendment Policy
- **Amendments**: Any change to tech stack, architecture boundaries, or approved screen scope MUST update `specs/001-ui-prototype/spec.md` and `plan.md` prior to code edits (`Documentation-Code Consistency`).
- **Compliance**: Reviewed during Phase 5 (`speckit-converge` and `code-reviewer` audit) prior to final acceptance.

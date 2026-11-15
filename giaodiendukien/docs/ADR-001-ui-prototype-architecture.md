# ADR-001: Client–Server UI Prototype Workspace Architecture & Simulated Transport

- **Status**: Accepted
- **Date**: 2026-11-11
- **Context**: The Household Food Management & FEFO Recommendation system consists of two distinct applications — a Desktop Server workbench (`DSK-*`) and a touch-first Mobile Client (`MOB-*`) — requiring independent startup/demonstration, zero real backend/database deployment, and shared business rules derived from `food_management.sql` and `Thiet_ke_cau_truc_giao_dien_du_kien.md`.

## Decision
1. **npm Workspaces Monorepo (`Quan_ly_Thuc_Pham/`)**: Split into `@food-mgmt/shared-sim` (pure TypeScript domain/engine/protocol), `@food-mgmt/desktop-server` (Vite + React, port `5173`), and `@food-mgmt/mobile-client` (Vite + React, port `5174`).
2. **In-Process + BroadcastChannel Simulation Layer**: `SimulatedServerNode` and `SimulatedClientTransport` share exact SQL-faithful mutation rules (`sp_use_food`, duplicate batch check, `COOK_RECIPE`, soft delete `Đã hủy`, `view_alerts`), persist snapshots to `localStorage`, work 100% standalone when each app runs independently, and support explicit fault/latency/offline toggles so Prototype users never mistake simulated connections for real sockets/MySQL.
3. **Platform-Distinct Styling Without Cross-App Coupling**: `desktop-server` (`13px` Culinary Slate Workbench) and `mobile-client` (`15px`, `>= 44px` Warm Pantry Stone `#FAF9F6`) maintain independent CSS token sheets sharing Concept A palette & WCAG-verified `dataviz` SVG chart geometry.

## Consequences
- **Positive**: Desktop and Mobile run and build independently, business logic and mock data remain cleanly decoupled from UI components, and Vitest + Playwright verify both apps reproducibly without external services.
- **Trade-off**: Cross-port browser origins (`localhost:5173` vs `localhost:5174`) isolate `localStorage`/`BroadcastChannel` by browser origin; standalone mode simulates the remote peer locally via `SimulatedServerNode` and demo client triggers, while same-origin hosting enables direct live cross-tab `BroadcastChannel` sync.

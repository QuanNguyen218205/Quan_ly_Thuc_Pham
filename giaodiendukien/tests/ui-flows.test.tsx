import '@testing-library/jest-dom/vitest';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub third-party lucide-react SVG icon wrappers so they emit elements using the active
// workspace React 18 instance instead of root hoisted React 19 (npm workspace peer split).
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lucide-react');
  const stubbed: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    if (key === '__esModule' || key === 'default') continue;
    stubbed[key] = (props: Record<string, unknown>) => {
      const r = (globalThis as Record<string, { createElement: (...args: unknown[]) => unknown }>)
        .React;
      return r
        ? r.createElement('svg', {
            'data-lucide': key,
            'aria-hidden': props?.['aria-hidden'] ?? true,
          })
        : null;
    };
  }
  return stubbed;
});

const req = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface WorkspaceMounted {
  unmount: () => void;
}

function mountWorkspaceApp(
  workspaceDir: 'mobile-client' | 'desktop-server',
  Component: unknown,
): WorkspaceMounted {
  const wsReact = req(path.join(rootDir, workspaceDir, 'node_modules', 'react'));
  const wsReactDomClient = req(
    path.join(rootDir, workspaceDir, 'node_modules', 'react-dom', 'client'),
  );
  const wsTestUtils = req(
    path.join(rootDir, workspaceDir, 'node_modules', 'react-dom', 'test-utils'),
  );

  // Align classic JSX React global with the workspace's React 18 instance
  (globalThis as Record<string, unknown>).React = wsReact;
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: { render: (el: unknown) => void; unmount: () => void } | null = null;

  wsTestUtils.act(() => {
    root = wsReactDomClient.createRoot(container);
    root!.render(wsReact.createElement(Component));
  });

  return {
    unmount: () => {
      if (root) {
        wsTestUtils.act(() => {
          root!.unmount();
        });
      }
      container.remove();
    },
  };
}

describe('UI DOM Integration Flows (Mobile & Desktop)', () => {
  let activeMount: WorkspaceMounted | null = null;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    activeMount?.unmount();
    activeMount = null;
  });

  it('preserves user-typed MOB-06 form values on NETWORK_DROP and succeeds on retry', async () => {
    const sharedSim = await import('@food-mgmt/shared-sim');
    const transport = sharedSim.getSharedMobileClientTransport();
    transport.getLocalServerNode().setSimulatedLatencyMs(0);
    transport.setSimulatedLatencyMs(0);

    const { App: MobileApp } = await import('@food-mgmt/mobile-client/App');
    activeMount = mountWorkspaceApp('mobile-client', MobileApp);

    // 1. Pair at MOB-00 with valid defaults
    expect(await screen.findByTestId('mob-screen-MOB-00')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mob-connect-submit'));

    // 2. Arrive at MOB-01 FEFO home
    expect(await screen.findByTestId('mob-screen-MOB-01')).toBeInTheDocument();
    expect(await screen.findByTestId('mob-fefo-card-3')).toBeInTheDocument();

    // 3. Open MOB-06 Manual Add Form via FAB
    fireEvent.click(screen.getByTestId('mob-fab-add'));
    fireEvent.click(await screen.findByTestId('mob-fab-manual-add'));
    expect(await screen.findByTestId('mob-screen-MOB-06')).toBeInTheDocument();

    // 4. Fill user values across fields
    fireEvent.change(screen.getByTestId('mob-form-food-code'), { target: { value: 'TP099' } });
    fireEvent.change(screen.getByTestId('mob-form-food-name'), {
      target: { value: 'Bơ lạt Anchor QA' },
    });
    fireEvent.change(screen.getByTestId('mob-form-quantity'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByTestId('mob-form-note'), {
      target: { value: 'Giữ nguyên trường khi mất mạng' },
    });

    // 5. Inject one-shot NETWORK_DROP right before submitting
    transport.setClientFaultOverride('NETWORK_DROP');
    fireEvent.click(screen.getByTestId('mob-form-submit-btn'));

    // 6. Verify error banner appears AND all user-entered draft inputs remain preserved
    const netError = await screen.findByTestId('mob-form-network-error');
    expect(netError).toHaveTextContent('Chưa lưu được — Dữ liệu biểu mẫu đã được giữ nguyên');
    expect(screen.getByTestId('mob-form-food-code')).toHaveValue('TP099');
    expect(screen.getByTestId('mob-form-food-name')).toHaveValue('Bơ lạt Anchor QA');
    expect(screen.getByTestId('mob-form-quantity')).toHaveValue(2.5);
    expect(screen.getByTestId('mob-form-note')).toHaveValue('Giữ nguyên trường khi mất mạng');

    // 7. Retry save now succeeds and item becomes searchable in MOB-02
    fireEvent.click(screen.getByTestId('mob-form-retry-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('mob-screen-MOB-06')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mob-tab-MOB-02'));
    expect(await screen.findByTestId('mob-screen-MOB-02')).toBeInTheDocument();
    expect(await screen.findByText('Bơ lạt Anchor QA')).toBeInTheDocument();
  });

  it('shows honest ERR_INSUFFICIENT_STOCK feedback and preserves stock in Mobile StockActionSheet (MOB-S01)', async () => {
    const sharedSim = await import('@food-mgmt/shared-sim');
    const transport = sharedSim.getSharedMobileClientTransport();
    transport.getLocalServerNode().setSimulatedLatencyMs(0);
    transport.setSimulatedLatencyMs(0);

    const { App: MobileApp } = await import('@food-mgmt/mobile-client/App');
    activeMount = mountWorkspaceApp('mobile-client', MobileApp);

    expect(await screen.findByTestId('mob-screen-MOB-00')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mob-connect-submit'));

    // Open Use Food sheet for LO-004 (item_id: 4, Thịt ba chỉ heo, 0.8 kg)
    const useBtn = await screen.findByTestId('mob-fefo-use-4');
    fireEvent.click(useBtn);

    expect(await screen.findByTestId('mob-sheet-MOB-S01')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('mob-stock-current-qty')).toHaveTextContent('0.8 kg');
    });

    // Enter amount > stock (5 > 0.8) and confirm
    fireEvent.change(screen.getByTestId('mob-stock-qty-input'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('mob-stock-confirm'));

    const errBanner = await screen.findByTestId('mob-stock-error');
    expect(errBanner).toHaveTextContent('ERR_INSUFFICIENT_STOCK');
    expect(errBanner).toHaveTextContent('Lỗi: Số lượng sử dụng lớn hơn tồn kho thực tế!');
    expect(screen.getByTestId('mob-stock-current-qty')).toHaveTextContent('0.8 kg');
    expect(screen.getByTestId('mob-sheet-MOB-S01')).toBeInTheDocument();
  });

  it('shows ERR_INSUFFICIENT_STOCK in Desktop InventoryActionModal (DSK-M02) and shifts simulated date +3d', async () => {
    const sharedSim = await import('@food-mgmt/shared-sim');
    sharedSim.getSharedDesktopServerNode().setSimulatedLatencyMs(0);

    const { App: DesktopApp } = await import('@food-mgmt/desktop-server/App');
    activeMount = mountWorkspaceApp('desktop-server', DesktopApp);

    expect(await screen.findByTestId('dsk-screen-DSK-01')).toBeInTheDocument();
    expect(screen.getByTestId('dsk-sim-effective-date')).toHaveTextContent('2026-11-11');

    // Navigate to Inventory (DSK-03), open LO-004 drawer, open Use modal (DSK-M02)
    fireEvent.click(screen.getByTestId('dsk-nav-DSK-03'));
    expect(await screen.findByTestId('dsk-screen-DSK-03')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('dsk-inv-row-4'));

    expect(await screen.findByTestId('dsk-drawer-DSK-03-D')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('dsk-drawer-use'));

    expect(await screen.findByTestId('dsk-modal-DSK-M02')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('dsk-m02-qty-input'), { target: { value: '3.5' } });
    fireEvent.click(screen.getByTestId('dsk-m02-submit'));

    const dskErr = await screen.findByTestId('dsk-m02-error');
    expect(dskErr).toHaveTextContent('Lỗi: Số lượng sử dụng lớn hơn tồn kho thực tế!');
    expect(screen.getByTestId('dsk-modal-DSK-M02')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dsk-m02-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('dsk-modal-DSK-M02')).not.toBeInTheDocument();
    });

    // Shift simulated date +3d -> 2026-11-14
    fireEvent.click(screen.getByTestId('dsk-sim-plus-3d'));
    await waitFor(() => {
      expect(screen.getByTestId('dsk-sim-effective-date')).toHaveTextContent('2026-11-14');
    });
  });
});

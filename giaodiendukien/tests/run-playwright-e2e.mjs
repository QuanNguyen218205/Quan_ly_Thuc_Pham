import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(TEST_DIR, '..');
const CHROME_EXECUTABLE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const VITE_BIN = path.join(PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const PASSED_STEPS = [];
const FAILED_STEPS = [];

async function runStep(name, fn, cleanup) {
  process.stdout.write(`  [RUN ] ${name} ... `);
  try {
    await fn();
    PASSED_STEPS.push(name);
    process.stdout.write('PASS\n');
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 4)
            .join(' | ')
        : String(err);
    FAILED_STEPS.push({ name, message });
    process.stdout.write(`FAIL\n    -> ${message}\n`);
    if (cleanup) {
      await cleanup().catch(() => {});
    }
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close(() => reject(new Error('Failed to obtain numeric ephemeral port')));
        return;
      }
      const { port } = addr;
      server.close((closeErr) => {
        if (closeErr) reject(closeErr);
        else resolve(port);
      });
    });
  });
}

async function waitForHttpReady(url, proc, stderrChunks, timeoutMs = 25000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(
        `Vite server exited prematurely with code ${proc.exitCode}: ${stderrChunks.join('')}`,
      );
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for Vite dev server at ${url}`);
}

async function startViteServer(workspaceRelDir, port) {
  const cwd = path.join(PROJECT_ROOT, workspaceRelDir);
  const stderrChunks = [];
  const proc = spawn(
    process.execPath,
    [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  proc.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));
  const url = `http://127.0.0.1:${port}`;
  await waitForHttpReady(url, proc, stderrChunks);
  return { url, proc };
}

function stopProcessTree(proc) {
  if (!proc || proc.exitCode !== null || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      proc.kill('SIGKILL');
    }
  } catch {
    try {
      proc.kill('SIGKILL');
    } catch {
      // Already terminated
    }
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth,
    `${label}: horizontal overflow detected (scrollWidth=${metrics.scrollWidth} > clientWidth=${metrics.clientWidth})`,
  );
}

async function findBrokenSvgs(page) {
  return page.evaluate(() => {
    const problems = [];
    const attrs = ['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'viewBox'];
    const svgs = Array.from(document.querySelectorAll('svg'));
    for (let i = 0; i < svgs.length; i += 1) {
      const svg = svgs[i];
      if (svg.getClientRects().length === 0) continue;
      const style = window.getComputedStyle(svg);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = svg.getBoundingClientRect();
      const testidHost = svg.closest('[data-testid]')?.getAttribute('data-testid') || 'no-testid';
      const svgCls = svg.getAttribute('class') || '';
      const parentText = (svg.parentElement?.textContent || '').trim().slice(0, 40);
      const contextDesc = `[testid=${testidHost} class="${svgCls}" text="${parentText}"]`;
      if (!(rect.width > 0 && rect.height > 0)) {
        problems.push(`svg[${i}] zero-size rect (${rect.width}x${rect.height}) ${contextDesc}`);
      }
      const nodes = [svg, ...Array.from(svg.querySelectorAll('*'))];
      for (const node of nodes) {
        for (const attr of attrs) {
          const val = node.getAttribute(attr);
          if (val !== null && /NaN|Infinity|undefined/.test(val)) {
            problems.push(`svg[${i}] <${node.tagName}> ${attr}="${val}" ${contextDesc}`);
          }
        }
      }
    }
    return problems;
  });
}

async function collectBrokenSvgs(page, label, sink) {
  const issues = await findBrokenSvgs(page);
  for (const issue of issues) {
    sink.push(`[svg] ${label}: ${issue}`);
  }
}

async function assertNoBrokenSvgs(page, label) {
  const issues = await findBrokenSvgs(page);
  assert.equal(
    issues.length,
    0,
    `${label}: broken SVG(s) detected: ${issues.join(' | ')}`,
  );
}

function attachErrorListeners(page, sink) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const locUrl = msg.location()?.url;
      sink.push(`[console.error] ${msg.text()}${locUrl ? ` (${locUrl})` : ''}`);
    }
  });
  page.on('pageerror', (err) => {
    sink.push(`[pageerror] ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      sink.push(`[http.${res.status()}] ${res.url()}`);
    }
  });
}

async function verifyDesktopFlows(browser, desktopUrl) {
  console.log(`\n[Desktop E2E] Target: ${desktopUrl}`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  attachErrorListeners(page, runtimeErrors);

  try {
    await runStep('DSK-01 load + prototype disclosure + overflow check (1440x900)', async () => {
      await page.goto(desktopUrl, { waitUntil: 'networkidle' });
      await page.getByTestId('dsk-screen-DSK-01').waitFor({ state: 'visible' });
      const badgeText = await page.getByTestId('dsk-prototype-badge').textContent();
      assert.ok(
        badgeText && badgeText.includes('Prototype'),
        `Expected prototype badge text, got: ${badgeText}`,
      );
      await page.getByTestId('dsk-listener-pill').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'DSK-01 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-01 (1440x900)');
    });

    await runStep('DSK-01 SVG charts non-zero bounding boxes + Chart/Table toggles', async () => {
      const svgBoxes = await page.locator('.svg-chart-wrap svg').evaluateAll((nodes) =>
        nodes.map((el) => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      assert.equal(svgBoxes.length, 2, `Expected 2 SVG charts on DSK-01, found ${svgBoxes.length}`);
      for (const [idx, box] of svgBoxes.entries()) {
        assert.ok(
          box.width > 100 && box.height > 100,
          `SVG chart #${idx + 1} has invalid bounding box: ${JSON.stringify(box)}`,
        );
      }

      // Toggle Chart 1 -> Table -> Chart
      await page.getByTestId('dsk-chart-trend-toggle-table').click();
      await page
        .locator('[aria-label="Biểu đồ xu hướng nhập xuất và tiêu hủy"] table tbody tr')
        .first()
        .waitFor({ state: 'visible' });
      await page.getByTestId('dsk-chart-trend-toggle-chart').click();
      await page
        .locator('[aria-label="Biểu đồ xu hướng nhập xuất và tiêu hủy"] .svg-chart-wrap svg')
        .waitFor({ state: 'visible' });

      // Toggle Chart 2 -> Table -> Chart
      await page.getByTestId('dsk-chart-area-toggle-table').click();
      await page
        .locator('[aria-label="Biểu đồ phân bố tồn kho theo khu vực"] table tbody tr')
        .first()
        .waitFor({ state: 'visible' });
      await page.getByTestId('dsk-chart-area-toggle-chart').click();
      await page
        .locator('[aria-label="Biểu đồ phân bố tồn kho theo khu vực"] .svg-chart-wrap svg')
        .waitFor({ state: 'visible' });
    });

    await runStep('DSK Time Simulation +3d updates KPI/alerts & reset restores baseline', async () => {
      const initialDate = (await page.getByTestId('dsk-sim-effective-date').textContent())?.trim();
      assert.equal(initialDate, '2026-11-11');
      const initialAlertsText = await page
        .locator('[data-testid="dsk-kpi-expiry-alerts"] .kpi-value')
        .textContent();
      assert.equal(initialAlertsText?.trim(), '7');

      await page.getByTestId('dsk-sim-plus-3d').click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="dsk-sim-effective-date"]')?.textContent?.trim() ===
          '2026-11-14',
      );
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="dsk-kpi-expiry-alerts"] .kpi-value')
            ?.textContent?.trim() === '11',
      );

      await page.getByTestId('dsk-sim-reset').click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="dsk-sim-effective-date"]')?.textContent?.trim() ===
          '2026-11-11',
      );
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="dsk-kpi-expiry-alerts"] .kpi-value')
            ?.textContent?.trim() === '7',
      );
    });

    await runStep('DSK-02 FEFO + Recipe Detail Modal (DSK-M03)', async () => {
      await page.getByTestId('dsk-nav-DSK-02').click();
      await page.getByTestId('dsk-screen-DSK-02').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'DSK-02 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-02 (1440x900)');

      await page.getByTestId('dsk-recipe-card-1').click();
      await page.getByTestId('dsk-modal-DSK-M03').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-m03-cook-btn').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-m03-close').click();
      await page.getByTestId('dsk-modal-DSK-M03').waitFor({ state: 'hidden' });
    });

    await runStep('DSK-03 5-criteria search/filter + Drawer DSK-03-D (1440x900)', async () => {
      await page.getByTestId('dsk-nav-DSK-03').click();
      await page.getByTestId('dsk-screen-DSK-03').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'DSK-03 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-03 (1440x900)');

      // Apply all 5 filter dimensions cleanly matching LO-003 (Rau xà lách mỡ Đà Lạt)
      await page.getByTestId('dsk-inv-search').fill('Xà lách');
      await page.getByTestId('dsk-inv-filter-category').selectOption('1');
      await page.getByTestId('dsk-inv-filter-area').selectOption('Trong tủ lạnh');
      await page.getByTestId('dsk-inv-filter-location').selectOption('3');
      await page.getByTestId('dsk-inv-filter-stock').selectOption('Đang sử dụng');
      await page.getByTestId('dsk-inv-filter-expiry').selectOption('expiring_soon');

      await page.getByTestId('dsk-inv-row-3').waitFor({ state: 'visible' });
      const rowCount = await page.locator('[data-testid^="dsk-inv-row-"]').count();
      assert.equal(rowCount, 1, `Expected 1 matching row (LO-003), got ${rowCount}`);

      await page.getByTestId('dsk-inv-clear-filters').click();
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid^="dsk-inv-row-"]').length >= 16,
      );

      // Open Drawer DSK-03-D for LO-003 (Rau xà lách mỡ Đà Lạt)
      await page.getByTestId('dsk-inv-row-3').click();
      await page.getByTestId('dsk-drawer-DSK-03-D').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-drawer-use').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'DSK-03 + DSK-03-D (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-03 + DSK-03-D (1440x900)');
    });

    await runStep(
      'DSK-M02 Stock Action Modal tabs + auto-close after submit',
      async () => {
        await page.getByTestId('dsk-drawer-use').click();
        await page.getByTestId('dsk-modal-DSK-M02').waitFor({ state: 'visible' });

        await page.getByTestId('dsk-m02-mode-restock').click();
        await page.getByTestId('dsk-m02-qty-input').waitFor({ state: 'visible' });

        await page.getByTestId('dsk-m02-mode-adjust').click();
        await page.getByTestId('dsk-m02-qty-input').waitFor({ state: 'visible' });

        await page.getByTestId('dsk-m02-mode-move').click();
        await page.getByTestId('dsk-m02-location-select').waitFor({ state: 'visible' });

        await page.getByTestId('dsk-m02-mode-use').click();
        await page.getByTestId('dsk-m02-qty-input').fill('0.2');
        await page.getByTestId('dsk-m02-reason-input').fill('E2E uống bữa sáng');
        await page.getByTestId('dsk-m02-submit').click();

        await page.getByTestId('dsk-modal-DSK-M02').waitFor({ state: 'hidden', timeout: 4000 });
        await page.getByTestId('dsk-drawer-close').click();
        await page.getByTestId('dsk-drawer-DSK-03-D').waitFor({ state: 'hidden' });
      },
      async () => {
        if (await page.getByTestId('dsk-modal-DSK-M02').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-m02-cancel').click().catch(() => {});
        }
        if (await page.getByTestId('dsk-drawer-DSK-03-D').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-drawer-close').click().catch(() => {});
        }
      },
    );

    await runStep(
      'DSK-M01 AI Scan + duplicate merge flow + auto-close after save',
      async () => {
        await page.getByTestId('dsk-inv-ai-btn').click();
        await page.getByTestId('dsk-modal-DSK-M01').waitFor({ state: 'visible' });

        await page.getByTestId('dsk-m01-ai-preset-select').selectOption('preset-sua-vinamilk');
        await page.getByTestId('dsk-m01-ai-scan-btn').click();
        await page.waitForFunction(
          () =>
            document.querySelector('[data-testid="dsk-m01-food-name"]')?.value ===
            'Sữa tươi thanh trùng Vinamilk',
        );

        // Submit triggers duplicate food name prompt -> merge into TP001 -> save new lot
        await page.getByTestId('dsk-m01-submit').click();
        await page.getByTestId('dsk-m01-duplicate-banner').waitFor({ state: 'visible' });
        await page.getByTestId('dsk-m01-merge-btn').click();
        await page.getByTestId('dsk-m01-submit').click();
        await page.getByTestId('dsk-modal-DSK-M01').waitFor({ state: 'hidden', timeout: 4000 });
      },
      async () => {
        if (await page.getByTestId('dsk-modal-DSK-M01').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-m01-cancel').click().catch(() => {});
        }
        if (await page.getByTestId('dsk-drawer-DSK-03-D').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-drawer-close').click().catch(() => {});
        }
      },
    );

    await runStep(
      'DSK-M04 Liquidate confirmation + auto-close after submit',
      async () => {
        await page.getByTestId('dsk-inv-row-1').click();
        await page.getByTestId('dsk-drawer-delete').waitFor({ state: 'visible' });
        await page.getByTestId('dsk-drawer-delete').click();
        await page.getByTestId('dsk-modal-DSK-M04').waitFor({ state: 'visible' });
        await page.getByTestId('dsk-m04-reason-input').fill('Thanh lý lô quá hạn trong E2E');
        await page.getByTestId('dsk-m04-submit').click();
        await page.getByTestId('dsk-modal-DSK-M04').waitFor({ state: 'hidden', timeout: 4000 });

        const row1Text = await page.getByTestId('dsk-inv-row-1').textContent();
        assert.ok(
          row1Text && row1Text.includes('Đã hủy'),
          `Expected LO-001 to become Đã hủy after DSK-M04, got: ${row1Text}`,
        );
        assert.equal(
          await page.getByTestId('dsk-drawer-edit').isDisabled(),
          true,
          'Expected DSK-03-D Edit button to be disabled for Đã hủy lot LO-001',
        );
        assert.equal(
          await page.getByTestId('dsk-drawer-delete').isDisabled(),
          true,
          'Expected DSK-03-D Thanh lý button to be disabled for Đã hủy lot LO-001',
        );
        await page.getByTestId('dsk-drawer-close').click();
        await page.getByTestId('dsk-drawer-DSK-03-D').waitFor({ state: 'hidden' });

        await page.getByTestId('dsk-inv-act-edit-1').waitFor({ state: 'visible' });
        assert.equal(
          await page.getByTestId('dsk-inv-act-edit-1').isDisabled(),
          true,
          'Expected DSK-03 row Edit button to be disabled for Đã hủy lot LO-001',
        );
        await page.getByTestId('dsk-inv-act-edit-16').waitFor({ state: 'visible' });
        assert.equal(
          await page.getByTestId('dsk-inv-act-edit-16').isDisabled(),
          true,
          'Expected DSK-03 row Edit button to be disabled for seed Đã hủy lot LO-016',
        );
      },
      async () => {
        if (await page.getByTestId('dsk-modal-DSK-M04').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-m04-cancel').click().catch(() => {});
        }
        if (await page.getByTestId('dsk-drawer-DSK-03-D').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-drawer-close').click().catch(() => {});
        }
      },
    );

    await runStep('DSK-04 Alerts + DSK-05 Audit Logs keyboard activation (1440x900)', async () => {
      await page.getByTestId('dsk-nav-DSK-04').click();
      await page.getByTestId('dsk-screen-DSK-04').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-alerts-tab-stock').click();
      await page.getByTestId('dsk-alerts-tab-expiry').click();
      await page.getByTestId('dsk-alerts-scan-btn').click();
      await assertNoHorizontalOverflow(page, 'DSK-04 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-04 (1440x900)');

      await page.getByTestId('dsk-nav-DSK-05').click();
      await page.getByTestId('dsk-screen-DSK-05').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'DSK-05 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-05 (1440x900)');

      const firstAuditRow = page.locator('[data-testid^="dsk-audit-row-"]').first();
      await firstAuditRow.waitFor({ state: 'visible' });
      await firstAuditRow.focus();
      await page.keyboard.press('Enter');
      await page.getByTestId('dsk-drawer-DSK-03-D').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.getByTestId('dsk-drawer-DSK-03-D').waitFor({ state: 'hidden' });
    });

    await runStep(
      'DSK-M05 Catalog Form Modal create + auto-close after submit',
      async () => {
        await page.getByTestId('dsk-nav-DSK-06').click();
        await page.getByTestId('dsk-screen-DSK-06').waitFor({ state: 'visible' });
        await page.getByTestId('dsk-catalog-add-btn').click();
        await page.getByTestId('dsk-modal-DSK-M05').waitFor({ state: 'visible' });
        await page.getByTestId('dsk-m05-name-input').fill('Đồ ăn vặt E2E');
        await page.getByTestId('dsk-m05-submit').click();
        await page.getByTestId('dsk-modal-DSK-M05').waitFor({ state: 'hidden', timeout: 4000 });
      },
      async () => {
        if (await page.getByTestId('dsk-modal-DSK-M05').isVisible().catch(() => false)) {
          await page.getByTestId('dsk-m05-cancel').click().catch(() => {});
        }
      },
    );

    await runStep('DSK-06 Catalogs two-step delete + CONSTRAINT_IN_USE check (1440x900)', async () => {
      await page.getByTestId('dsk-screen-DSK-06').getByText('Đồ ăn vặt E2E').waitFor({ state: 'visible' });

      // First click switches row action to inline confirmation without deleting
      await page.getByTestId('dsk-catalog-delete-1').click();
      const confirmBtn1 = page.getByTestId('dsk-catalog-confirm-delete-1');
      await confirmBtn1.waitFor({ state: 'visible' });
      const confirmText = await confirmBtn1.textContent();
      assert.ok(
        confirmText && confirmText.includes('Xác nhận xóa'),
        `Expected two-step delete confirmation label "Xác nhận xóa", got: ${confirmText}`,
      );
      assert.equal(await page.getByTestId('dsk-catalog-constraint-error').isVisible(), false);

      // Cancel restores idle action; confirm executes deletion and surfaces CONSTRAINT_IN_USE
      await page.getByTestId('dsk-catalog-cancel-delete-1').click();
      await page.getByTestId('dsk-catalog-delete-1').waitFor({ state: 'visible' });

      await page.getByTestId('dsk-catalog-delete-1').click();
      await confirmBtn1.click();
      await page.getByTestId('dsk-catalog-constraint-error').waitFor({ state: 'visible' });

      // Two-step confirmation actually removes unreferenced custom category
      const createdRow = page.locator('[data-testid="dsk-screen-DSK-06"] tbody tr', {
        hasText: 'Đồ ăn vặt E2E',
      });
      await createdRow.locator('[data-testid^="dsk-catalog-delete-"]').click();
      await createdRow.locator('[data-testid^="dsk-catalog-confirm-delete-"]').click();
      await createdRow.waitFor({ state: 'hidden' });

      await assertNoHorizontalOverflow(page, 'DSK-06 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-06 (1440x900)');
    });

    await runStep('DSK-07 Settings tabs + overflow check (1440x900)', async () => {
      await page.getByTestId('dsk-nav-DSK-07').click();
      await page.getByTestId('dsk-screen-DSK-07').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-settings-tab-network').click();
      await page.getByTestId('dsk-settings-tab-business').click();
      await assertNoHorizontalOverflow(page, 'DSK-07 (1440x900)');
      await assertNoBrokenSvgs(page, 'DSK-07 (1440x900)');
    });

    await runStep('DSK-M06 System Tray popover + minimize-to-tray + restore window', async () => {
      await page.getByTestId('dsk-tray-toggle-btn').click();
      await page.getByTestId('dsk-popover-DSK-M06').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-m06-open-window').click();
      await page.getByTestId('dsk-screen-DSK-01').waitFor({ state: 'visible' });

      await page.getByTestId('dsk-minimize-tray-btn').click();
      await page.getByTestId('dsk-tray-minimized-view').waitFor({ state: 'visible' });
      await page.getByTestId('dsk-popover-DSK-M06').waitFor({ state: 'visible' });

      await page.getByTestId('dsk-restore-window-btn').click();
      await page.getByTestId('dsk-screen-DSK-01').waitFor({ state: 'visible' });
    });

    await runStep('Desktop 1280x720 zero horizontal overflow & SVG health across all 7 screens', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      for (const screenId of ['DSK-01', 'DSK-02', 'DSK-03', 'DSK-04', 'DSK-05', 'DSK-06', 'DSK-07']) {
        await page.getByTestId(`dsk-nav-${screenId}`).click();
        await page.getByTestId(`dsk-screen-${screenId}`).waitFor({ state: 'visible' });
        await assertNoHorizontalOverflow(page, `${screenId} (1280x720)`);
        await assertNoBrokenSvgs(page, `${screenId} (1280x720)`);
        if (screenId === 'DSK-01') {
          const chartBoxes = await page
            .locator('[data-testid="dsk-screen-DSK-01"] .svg-chart-wrap svg')
            .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
          assert.equal(chartBoxes.length, 2, `Expected 2 DSK-01 SVG charts at 1280x720, got ${chartBoxes.length}`);
          for (const box of chartBoxes) {
            assert.ok(box.width > 100 && box.height > 100, `Invalid 1280x720 SVG chart box: ${JSON.stringify(box)}`);
          }
        }
      }
    });

    await runStep('Desktop zero console.error, pageerror & HTTP 4xx/5xx', async () => {
      assert.equal(
        runtimeErrors.length,
        0,
        `Desktop browser reported console/page/HTTP errors: ${runtimeErrors.join(' | ')}`,
      );
    });
  } finally {
    await context.close();
  }
}

async function verifyMobileFlows(browser, mobileUrl) {
  console.log(`\n[Mobile E2E] Target: ${mobileUrl}`);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  const svgErrors = [];
  attachErrorListeners(page, runtimeErrors);

  try {
    await runStep('MOB-00 Ping & Connect (invalid PIN rejected + valid PIN connects)', async () => {
      await page.goto(mobileUrl, { waitUntil: 'networkidle' });
      await page.getByTestId('mob-screen-MOB-00').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-00 (390x844)');
      await collectBrokenSvgs(page, 'MOB-00 (390x844)', svgErrors);

      await page.getByTestId('mob-connect-pin').fill('0000');
      await page.getByTestId('mob-connect-submit').click();
      await page.getByTestId('mob-connect-error').waitFor({ state: 'visible' });

      await page.getByTestId('mob-connect-pin').fill('4829');
      await page.getByTestId('mob-connect-submit').click();
      await page.getByTestId('mob-screen-MOB-01').waitFor({ state: 'visible' });
      await page.getByTestId('mob-fefo-card-3').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-01 (390x844)');
      await collectBrokenSvgs(page, 'MOB-01 (390x844)', svgErrors);
    });

    await runStep('MOB-04 Recipes screen navigation + overflow check', async () => {
      await page.locator('[data-testid^="mob-home-recipe-"]').first().click();
      await page.getByTestId('mob-screen-MOB-04').waitFor({ state: 'visible' });
      await page.locator('[data-testid^="mob-recipe-card-"]').first().waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-04 (390x844)');
      await collectBrokenSvgs(page, 'MOB-04 (390x844)', svgErrors);
      await page.getByTestId('mob-topbar-back').click();
      await page.getByTestId('mob-screen-MOB-01').waitFor({ state: 'visible' });
    });

    await runStep('MOB-02 Inventory + MOB-S02 5-criteria Filter sheet + Escape close', async () => {
      await page.getByTestId('mob-tab-MOB-02').click();
      await page.getByTestId('mob-screen-MOB-02').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-02 (390x844)');
      await collectBrokenSvgs(page, 'MOB-02 (390x844)', svgErrors);

      await page.getByTestId('mob-open-filter-btn').click();
      await page.getByTestId('mob-sheet-MOB-S02').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.getByTestId('mob-sheet-MOB-S02').waitFor({ state: 'hidden' });

      await page.getByTestId('mob-open-filter-btn').click();
      await page.getByTestId('mob-sheet-MOB-S02').waitFor({ state: 'visible' });
      await page.getByTestId('mob-filter-cat-1').click();
      await page.getByTestId('mob-filter-area-Trong tủ lạnh').click();
      await page.getByTestId('mob-filter-loc-3').click();
      await page.getByTestId('mob-filter-stock-Đang sử dụng').click();
      await page.getByTestId('mob-filter-expiry-expiring_soon').click();
      await page.getByTestId('mob-filter-apply').click();

      await page.getByTestId('mob-sheet-MOB-S02').waitFor({ state: 'hidden' });
      await page.getByTestId('mob-inventory-card-3').waitFor({ state: 'visible' });
      const activeBadge = await page.getByTestId('mob-active-filter-count').textContent();
      assert.equal(activeBadge?.trim(), '5');

      // Reset filter cleanly and wait for async SEARCH_FOOD_ITEMS({}) reset to restore all 16 cards
      await page.getByTestId('mob-open-filter-btn').click();
      await page.getByTestId('mob-filter-reset').click();
      await page.getByTestId('mob-filter-apply').click();
      await page.getByTestId('mob-sheet-MOB-S02').waitFor({ state: 'hidden' });
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid^="mob-inventory-card-"]').length >= 16,
      );
    });

    await runStep('MOB-03 Detail + MOB-S01 Stepper + MOB-S03 2-level Move + MOB-S05 Liquidate + Escape close', async () => {
      await page.locator('[data-testid="mob-inventory-card-3"] .mob-food-card-main').click();
      await page.getByTestId('mob-screen-MOB-03').waitFor({ state: 'visible' });
      await page.getByTestId('mob-detail-profile').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-03 (390x844)');
      await collectBrokenSvgs(page, 'MOB-03 (390x844)', svgErrors);

      // MOB-S01 Stock Stepper Sheet + Escape close
      await page.getByTestId('mob-detail-stock-btn').click();
      await page.getByTestId('mob-sheet-MOB-S01').waitFor({ state: 'visible' });
      await page.getByTestId('mob-stock-tab-restock').click();
      await page.getByTestId('mob-stock-tab-adjust').click();
      await page.getByTestId('mob-stock-tab-use').click();
      await page.keyboard.press('Escape');
      await page.getByTestId('mob-sheet-MOB-S01').waitFor({ state: 'hidden' });

      // MOB-S03 2-level Move Location Sheet
      await page.getByTestId('mob-detail-move-btn').click();
      await page.getByTestId('mob-sheet-MOB-S03').waitFor({ state: 'visible' });
      await page.getByTestId('mob-move-area-Ngoài tủ lạnh').click();
      await page.getByTestId('mob-move-loc-7').click();
      await page.getByTestId('mob-move-confirm').click();
      await page.getByTestId('mob-sheet-MOB-S03').waitFor({ state: 'hidden' });

      // MOB-S05 Liquidate dialog: Escape dismiss + keep dismiss safely on active lot
      await page.getByTestId('mob-detail-cancel-btn').click();
      await page.getByTestId('mob-sheet-MOB-S05').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.getByTestId('mob-sheet-MOB-S05').waitFor({ state: 'hidden' });

      await page.getByTestId('mob-detail-cancel-btn').click();
      await page.getByTestId('mob-sheet-MOB-S05').waitFor({ state: 'visible' });
      await page.getByTestId('mob-liquidate-keep').click();
      await page.getByTestId('mob-sheet-MOB-S05').waitFor({ state: 'hidden' });

      await page.getByTestId('mob-topbar-back').click();
      await page.getByTestId('mob-screen-MOB-02').waitFor({ state: 'visible' });

      // Confirm liquidate on expired LO-001
      await page.locator('[data-testid="mob-inventory-card-1"] .mob-food-card-main').click();
      await page.getByTestId('mob-detail-cancel-btn').waitFor({ state: 'visible' });
      await page.getByTestId('mob-detail-cancel-btn').click();
      await page.getByTestId('mob-sheet-MOB-S05').waitFor({ state: 'visible' });
      await page.getByTestId('mob-liquidate-confirm').click();
      await page.getByTestId('mob-sheet-MOB-S05').waitFor({ state: 'hidden' });
      await page.getByTestId('mob-detail-cancel-btn').waitFor({ state: 'hidden', timeout: 4000 });
      const detailText = await page.getByTestId('mob-screen-MOB-03').textContent();
      assert.ok(
        detailText && detailText.includes('Đã hủy'),
        `Expected MOB-03 to show Đã hủy after liquidate, got: ${detailText}`,
      );

      await page.getByTestId('mob-topbar-back').click();
      await page.getByTestId('mob-screen-MOB-02').waitFor({ state: 'visible' });
    }, async () => {
      if (await page.getByTestId('mob-sheet-MOB-S05').isVisible().catch(() => false)) {
        await page.getByTestId('mob-liquidate-keep').click().catch(() => {});
      }
      if (await page.getByTestId('mob-sheet-MOB-S03').isVisible().catch(() => false)) {
        await page.keyboard.press('Escape').catch(() => {});
      }
      if (await page.getByTestId('mob-sheet-MOB-S01').isVisible().catch(() => false)) {
        await page.getByTestId('mob-stock-cancel').click().catch(() => {});
      }
      if (await page.getByTestId('mob-screen-MOB-03').isVisible().catch(() => false)) {
        await page.getByTestId('mob-topbar-back').click().catch(() => {});
      }
    });

    await runStep('MOB-S04 AI Scan Sheet + MOB-06 prefilled Add Form', async () => {
      await page.getByTestId('mob-fab-add').click();
      await page.getByTestId('mob-fab-ai-scan').click();
      await page.getByTestId('mob-sheet-MOB-S04').waitFor({ state: 'visible' });

      await page.getByTestId('mob-ai-preset-preset-thit-ba-roi').click();
      await page.getByTestId('mob-ai-scan-submit').click();
      await page.getByTestId('mob-ai-apply-btn').waitFor({ state: 'visible' });
      await page.getByTestId('mob-ai-apply-btn').click();

      await page.getByTestId('mob-screen-MOB-06').waitFor({ state: 'visible' });
      const aiName = await page.getByTestId('mob-form-food-name').inputValue();
      assert.equal(aiName, 'Thịt ba rọi heo');
      await assertNoHorizontalOverflow(page, 'MOB-06 (390x844)');
      await collectBrokenSvgs(page, 'MOB-06 (390x844)', svgErrors);

      await page.getByTestId('mob-form-cancel-btn').click();
      await page.getByTestId('mob-screen-MOB-02').waitFor({ state: 'visible' });
    });

    await runStep('MOB-05 Alerts & Shopping segments + MOB-07 Stats/Logs/Catalogs', async () => {
      await page.getByTestId('mob-tab-MOB-05').click();
      await page.getByTestId('mob-screen-MOB-05').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-05 (390x844)');
      await collectBrokenSvgs(page, 'MOB-05 (390x844)', svgErrors);
      await page.getByTestId('mob-alerts-seg-stock').click();
      await page.getByTestId('mob-alerts-seg-expiry').click();

      await page.getByTestId('mob-tab-MOB-07').click();
      await page.getByTestId('mob-screen-MOB-07').waitFor({ state: 'visible' });
      await assertNoHorizontalOverflow(page, 'MOB-07 (390x844)');
      await collectBrokenSvgs(page, 'MOB-07 (390x844)', svgErrors);
      const mobTrendBox = await page.getByTestId('mob-chart-trend-svg').boundingBox();
      const mobAreaBox = await page.getByTestId('mob-chart-area-svg').boundingBox();
      assert.ok(
        mobTrendBox && mobTrendBox.width > 100 && mobTrendBox.height > 80,
        `mob-chart-trend-svg has invalid bounding box: ${JSON.stringify(mobTrendBox)}`,
      );
      assert.ok(
        mobAreaBox && mobAreaBox.width > 100 && mobAreaBox.height > 80,
        `mob-chart-area-svg has invalid bounding box: ${JSON.stringify(mobAreaBox)}`,
      );
      await page.getByTestId('mob-stats-range-7').click();
      await page.getByTestId('mob-stats-range-30').click();
      await page.getByTestId('mob-catalog-tab-units').click();
      await page.getByTestId('mob-catalog-tab-locations').click();
      await page.getByTestId('mob-catalog-tab-categories').click();
    });

    await runStep('MOB-06 preserves unsaved draft values across NETWORK_DROP + succeeds on retry', async () => {
      // Arm 1-shot NETWORK_DROP on MOB-07 (tab switching does not issue RPCs)
      await page.getByTestId('mob-sim-fault-drop').click();
      await page.getByTestId('mob-tab-MOB-01').click();
      await page.getByTestId('mob-screen-MOB-01').waitFor({ state: 'visible' });

      await page.getByTestId('mob-fab-add').click();
      await page.getByTestId('mob-fab-manual-add').click();
      await page.getByTestId('mob-screen-MOB-06').waitFor({ state: 'visible' });

      await page.getByTestId('mob-form-food-code').fill('TP998');
      await page.getByTestId('mob-form-food-name').fill('Cá basa phi lê E2E');
      await page.getByTestId('mob-form-quantity').fill('1.5');
      await page.getByTestId('mob-form-note').fill('Giữ nguyên bản nháp khi mất mạng');

      await page.getByTestId('mob-form-submit-btn').click();
      await page.getByTestId('mob-form-network-error').waitFor({ state: 'visible' });

      // Verify all unsaved user inputs remained untouched in the form
      assert.equal(await page.getByTestId('mob-form-food-code').inputValue(), 'TP998');
      assert.equal(await page.getByTestId('mob-form-food-name').inputValue(), 'Cá basa phi lê E2E');
      assert.equal(await page.getByTestId('mob-form-quantity').inputValue(), '1.5');
      assert.equal(
        await page.getByTestId('mob-form-note').inputValue(),
        'Giữ nguyên bản nháp khi mất mạng',
      );

      // Retry succeeds and exits MOB-06
      await page.getByTestId('mob-form-retry-btn').click();
      await page.getByTestId('mob-screen-MOB-06').waitFor({ state: 'hidden' });
    });

    await runStep('Offline Read-Only banner disables writes while preserving cached reads', async () => {
      await page.getByTestId('mob-tab-MOB-07').click();
      await page.getByTestId('mob-sim-offline-toggle').click();
      await page.getByTestId('mob-offline-banner').waitFor({ state: 'visible' });

      await page.getByTestId('mob-tab-MOB-01').click();
      await page.getByTestId('mob-fefo-card-3').waitFor({ state: 'visible' });
      assert.equal(await page.getByTestId('mob-fab-add').isDisabled(), true);

      await page.getByTestId('mob-tab-MOB-02').click();
      await page.getByTestId('mob-inventory-card-3').click();
      await page.getByTestId('mob-screen-MOB-03').waitFor({ state: 'visible' });
      assert.equal(await page.getByTestId('mob-detail-stock-btn').isDisabled(), true);
      assert.equal(await page.getByTestId('mob-detail-move-btn').isDisabled(), true);
      assert.equal(await page.getByTestId('mob-detail-cancel-btn').isDisabled(), true);
      assert.equal(await page.getByTestId('mob-detail-edit-btn').isDisabled(), true);
    });

    await runStep('Mobile zero console.error, pageerror & HTTP 4xx/5xx', async () => {
      assert.equal(
        runtimeErrors.length,
        0,
        `Mobile browser reported console/page/HTTP errors: ${runtimeErrors.join(' | ')}`,
      );
    });

    await runStep('Mobile zero SVG errors across all screens (390x844)', async () => {
      assert.equal(
        svgErrors.length,
        0,
        `Mobile browser reported broken SVG(s): ${svgErrors.join(' || ')}`,
      );
    });
  } finally {
    await context.close();
  }
}

async function main() {
  assert.ok(fs.existsSync(CHROME_EXECUTABLE), `Chrome executable not found at ${CHROME_EXECUTABLE}`);
  assert.ok(fs.existsSync(VITE_BIN), `Vite CLI binary not found at ${VITE_BIN}`);

  const desktopPort = await getFreePort();
  const mobilePort = await getFreePort();
  let desktopServer = null;
  let mobileServer = null;
  let browser = null;

  try {
    console.log(`Starting temporary Vite dev servers (Desktop:${desktopPort}, Mobile:${mobilePort})...`);
    desktopServer = await startViteServer('desktop-server', desktopPort);
    mobileServer = await startViteServer('mobile-client', mobilePort);

    browser = await chromium.launch({
      executablePath: CHROME_EXECUTABLE,
      headless: true,
    });

    await verifyDesktopFlows(browser, desktopServer.url);
    await verifyMobileFlows(browser, mobileServer.url);

    const total = PASSED_STEPS.length + FAILED_STEPS.length;
    console.log(`\n[E2E SUMMARY] Passed: ${PASSED_STEPS.length}/${total}, Failed: ${FAILED_STEPS.length}/${total}`);
    if (FAILED_STEPS.length > 0) {
      for (const fail of FAILED_STEPS) {
        console.error(`  - FAILED [${fail.name}]: ${fail.message}`);
      }
      process.exitCode = 1;
    } else {
      console.log(`ALL PLAYWRIGHT E2E CHECKS PASSED (${total}/${total} steps, 0 console/page errors).`);
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    stopProcessTree(desktopServer?.proc);
    stopProcessTree(mobileServer?.proc);
  }
}

main().catch((err) => {
  console.error('\n[E2E FAILED]', err);
  process.exitCode = 1;
});

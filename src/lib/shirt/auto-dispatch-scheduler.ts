import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { dispatchShirtOrder } from "@/lib/shirt/dispatch";
import { ORDER_STATUS_PENDING, SHIRT_SKU_PREFIX } from "@/lib/shop";

declare global {
  var __shirtAutoDispatchSchedulerStarted: boolean | undefined;
}

type PendingOrderRow = {
  id: string;
};

function isEnabled(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  return fallback;
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim() ?? "";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function findDueOrders(): Promise<PendingOrderRow[]> {
  return sql<PendingOrderRow[]>`
    SELECT id
    FROM orders
    WHERE status = ${ORDER_STATUS_PENDING}
      AND sku LIKE ${`${SHIRT_SKU_PREFIX}%`}
      AND dispatch_at IS NOT NULL
      AND dispatch_at <= NOW()
    ORDER BY dispatch_at ASC
    LIMIT 50
  `;
}

async function runTick() {
  const startedAt = Date.now();
  const due = await findDueOrders();

  if (due.length === 0) {
    return;
  }

  let dispatched = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of due) {
    const result = await dispatchShirtOrder({
      orderId: row.id,
      reviewerUserId: null,
    });
    if (result.kind === "dispatched" || result.kind === "already_dispatched") {
      dispatched += 1;
    } else if (result.kind === "warehouse_failed") {
      failed += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(
    `[shirt-auto-dispatch] ok (${Date.now() - startedAt}ms) due=${due.length} dispatched=${dispatched} failed=${failed} skipped=${skipped}`,
  );
}

export function startShirtAutoDispatchScheduler() {
  if (globalThis.__shirtAutoDispatchSchedulerStarted === true) {
    return;
  }

  globalThis.__shirtAutoDispatchSchedulerStarted = true;

  if (!isEnabled(process.env.SHIRT_AUTO_DISPATCH_AUTOSTART, true)) {
    console.log("[shirt-auto-dispatch] autostart disabled");
    return;
  }

  const intervalMs = readPositiveIntegerEnv("SHIRT_AUTO_DISPATCH_INTERVAL_MS", 60_000);
  let inFlight = false;

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await ensureSchema();
      await runTick();
    } catch (error) {
      console.error(
        `[shirt-auto-dispatch] failed ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      inFlight = false;
    }
  };

  console.log(`[shirt-auto-dispatch] running every ${Math.round(intervalMs / 1000)}s`);
  void tick();

  const intervalId = setInterval(() => {
    void tick();
  }, intervalMs);

  const shutdown = (signal: string) => {
    clearInterval(intervalId);
    console.log(`[shirt-auto-dispatch] stopping (${signal})`);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

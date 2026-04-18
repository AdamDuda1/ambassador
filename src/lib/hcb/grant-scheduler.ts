import { processPendingOfficeGrants } from "@/lib/hcb/grants";
import { HCB_GRANT_SCHEDULER_INTERVAL_MS } from "@/lib/hcb/constants";

declare global {
  var __hcbGrantSchedulerStarted: boolean | undefined;
}

export function startHcbGrantScheduler() {
  if (globalThis.__hcbGrantSchedulerStarted === true) {
    return;
  }

  globalThis.__hcbGrantSchedulerStarted = true;
  const intervalMs = HCB_GRANT_SCHEDULER_INTERVAL_MS;
  let inFlight = false;

  const tick = async () => {
    if (inFlight) return;

    inFlight = true;

    try {
      const result = await processPendingOfficeGrants();

      if (result.attempted > 0) {
        console.log(
          `[hcb-grants] attempted=${result.attempted} linked=${result.linked} failed=${result.failed}`,
        );
      }
    } catch (error) {
      console.error("[hcb-grants] failed", error);
    } finally {
      inFlight = false;
    }
  };

  console.log(`[hcb-grants] running every ${Math.round(intervalMs / 1000)}s`);
  void tick();

  const intervalId = setInterval(() => {
    void tick();
  }, intervalMs);

  const shutdown = (signal: string) => {
    clearInterval(intervalId);
    console.log(`[hcb-grants] stopping (${signal})`);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

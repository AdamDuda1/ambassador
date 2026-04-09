"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";

export function ImpersonationPill({
  subjectDisplayName,
  subjectId,
}: {
  subjectDisplayName: string;
  subjectId: string;
}) {
  const t = useTranslations("app.impersonation");
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function stopImpersonating() {
    setHasError(false);
    setIsPending(true);

    const redirectTo = `${window.location.pathname}${window.location.search}`;
    const body = new URLSearchParams({ redirectTo });
    let response: Response;

    try {
      response = await fetch("/api/auth/impersonation/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch {
      setIsPending(false);
      setHasError(true);
      return;
    }

    if (!response.ok) {
      setIsPending(false);
      setHasError(true);
      return;
    }

    window.location.href = redirectTo || "/dashboard";
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{t("label")}</span>
      <a
        href={`/admin/users/${subjectId}`}
        className="cursor-pointer rounded bg-card text-sm text-foreground outline-none transition-opacity hover:opacity-70"
      >
        {t("active", { name: subjectDisplayName })}
      </a>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          void stopImpersonating();
        }}
        className={buttonVariants({ size: "xs" })}
      >
        {isPending ? t("stopping") : t("stop")}
      </button>
      {hasError ? <span className="text-xs text-primary">{t("stop-error")}</span> : null}
    </div>
  );
}

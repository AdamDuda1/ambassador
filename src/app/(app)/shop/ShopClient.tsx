"use client";

import Icon from "@hackclub/icons";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatHackClubAddress, type HackClubAddress } from "@/lib/settings";
import { SHIRT_SIZES, type ShirtSize } from "@/lib/shop";

export type ShopOrderState = {
  id: string;
  status: string;
  size: string | null;
  warehouseUrl: string | null;
  rejectionNote: string | null;
};

export default function ShopClient({
  addresses,
  selectedAddressIndex,
  existingOrder,
  statusKeys,
}: {
  addresses: HackClubAddress[];
  selectedAddressIndex: number;
  existingOrder: ShopOrderState | null;
  statusKeys: { pending: string; approved: string; rejected: string };
}) {
  const t = useTranslations("shop");
  const [size, setSize] = useState<ShirtSize>("M");
  const [addressIndex, setAddressIndex] = useState(selectedAddressIndex);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [order, setOrder] = useState<ShopOrderState | null>(existingOrder);

  const surfaceClass = cn(
    "ui-input-surface h-14 w-full !rounded-none [border-radius:0!important] border-0 px-4 text-base focus-visible:ring-1 focus-visible:ring-white/15",
    "disabled:cursor-not-allowed disabled:text-white/50",
  );
  const readOnlySurfaceClass = cn(
    surfaceClass,
    "text-foreground disabled:opacity-100 disabled:text-foreground disabled:[-webkit-text-fill-color:var(--foreground)]",
  );
  const selectContentClass =
    "!rounded-none [border-radius:0!important] border-white/10 bg-black text-white !duration-0 !data-open:animate-none !data-closed:animate-none !data-[side=bottom]:translate-y-0 !data-[side=top]:translate-y-0 !data-[side=left]:translate-x-0 !data-[side=right]:translate-x-0";

  if (order) {
    return (
      <div className="mt-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center text-acceptance">
            <Icon glyph="shirt-fill" size={36} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-sub text-2xl text-white">
              {order.status === statusKeys.approved
                ? t("order.approved-title")
                : order.status === statusKeys.rejected
                  ? t("order.rejected-title")
                  : t("order.pending-title")}
            </h2>
            <p className="mt-2 font-body text-base text-muted-foreground">
              {order.status === statusKeys.approved
                ? t("order.approved-body", { size: order.size ?? "" })
                : order.status === statusKeys.rejected
                  ? t("order.rejected-body")
                  : t("order.pending-body", { size: order.size ?? "" })}
            </p>

            {order.status === statusKeys.rejected && order.rejectionNote ? (
              <p className="mt-3 font-body text-sm text-rejection">
                {order.rejectionNote}
              </p>
            ) : null}

            {order.warehouseUrl ? (
              <a
                href={order.warehouseUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "app" }), "mt-6")}
              >
                {t("order.track-cta")}
                <Icon glyph="external-fill" size={16} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="mt-8 space-y-4">
        <p className="font-body text-base text-white">{t("no-address.body")}</p>
        <ExternalArrowLink
          href="https://auth.hackclub.com/addresses"
          label={t("no-address.cta")}
        />
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, addressIndex }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        setOrder({
          id: data?.id ?? "",
          status: statusKeys.pending,
          size,
          warehouseUrl: null,
          rejectionNote: null,
        });
      } else {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error === "no_address"
            ? t("errors.no-address")
            : data?.error === "not_ambassador"
              ? t("errors.not-ambassador")
              : data?.error === "already_ordered"
                ? t("errors.already-ordered")
                : data?.error === "invalid_size"
                  ? t("errors.invalid-size")
                  : t("errors.generic"),
        );
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-3">
        <Icon glyph="shirt-fill" size={28} className="text-primary" />
        <div>
          <h2 className="font-sub text-2xl text-white">
            {t("shirt.title")}
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            {t("shirt.subtitle")}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-body text-base tracking-wide text-white">
          {t("labels.size")}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SHIRT_SIZES.map((s) => {
            const active = s === size;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={cn(
                  "h-14 font-body text-base tracking-wide transition-colors",
                  active
                    ? "bg-primary text-white"
                    : "ui-input-surface text-white hover:bg-card",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-body text-base tracking-wide text-white">
          {t("labels.shipping-address")}
        </label>
        {addresses.length === 1 ? (
          <Input
            type="text"
            disabled
            value={formatHackClubAddress(addresses[0])}
            className={readOnlySurfaceClass}
          />
        ) : (
          <Select
            value={String(addressIndex)}
            onValueChange={(v) => setAddressIndex(Number(v))}
          >
            <SelectTrigger
              className={cn(
                surfaceClass,
                "!h-14 !bg-muted data-[state=open]:!bg-muted/80",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              sideOffset={0}
              avoidCollisions={false}
              className={selectContentClass}
            >
              {addresses.map((addr, i) => (
                <SelectItem
                  key={i}
                  value={String(i)}
                  className="focus:bg-card focus:text-white"
                >
                  {formatHackClubAddress(addr)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="mt-3 text-right">
          <ExternalArrowLink
            href="https://auth.hackclub.com/addresses"
            label={t("manage-addresses")}
          />
        </div>
      </div>

      {error ? (
        <p className="font-body text-base text-primary">{error}</p>
      ) : null}

      <div className="border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={buttonVariants({ size: "app" })}
        >
          {submitting ? t("actions.placing") : t("actions.place")}
        </button>
      </div>
    </div>
  );
}

function ExternalArrowLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 !text-primary !underline hover:!opacity-80"
    >
      {label}
      <Icon glyph="external-fill" size={14} />
    </a>
  );
}

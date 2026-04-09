import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Navbar } from "@/components/navbar";
import { isAcceptedApplicationStatus } from "@/lib/applications/status";
import sql from "@/lib/database/client";
import { ensureSchema } from "@/lib/database/ensure-schema";
import { getSession } from "@/lib/session";
import { buildWarehouseTrackingUrl, SHIRT_SKU_PREFIX } from "@/lib/shop";
import { normalizeHackClubAddresses } from "@/lib/settings";

import ShirtClient, { type ShirtOrderState } from "./ShirtClient";

type UserRow = {
  balance_cents: number | null;
  is_admin: boolean | null;
  hca_addresses: unknown;
  selected_address_index: number | null;
  shirt_enabled: boolean | null;
};

type ApplicationRow = {
  status: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  variant: string | null;
  warehouse_order_id: string | null;
  rejection_note: string | null;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("shirt"))("metadata.title") };
}

export default async function ShirtPage() {
  const session = await getSession();
  if (!session) redirect("/");

  await ensureSchema();
  const t = await getTranslations("shirt");

  const [[user], [latestApp], [existingOrderRow]] = await Promise.all([
    sql<UserRow[]>`
      SELECT balance_cents, is_admin, hca_addresses, selected_address_index, shirt_enabled
      FROM users
      WHERE id = ${session.sub}
      LIMIT 1
    `,
    sql<ApplicationRow[]>`
      SELECT status
      FROM applications
      WHERE user_id = ${session.sub}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    sql<OrderRow[]>`
      SELECT id, status, variant, warehouse_order_id, rejection_note
      FROM orders
      WHERE user_id = ${session.sub} AND sku LIKE ${`${SHIRT_SKU_PREFIX}%`}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
  ]);

  const addresses = normalizeHackClubAddresses(user?.hca_addresses);
  const selectedAddressIndex =
    addresses.length > 0 &&
    Number.isInteger(user?.selected_address_index) &&
    (user?.selected_address_index ?? 0) >= 0
      ? Math.min(user?.selected_address_index ?? 0, addresses.length - 1)
      : 0;
  const existingOrder: ShirtOrderState | null = existingOrderRow
    ? {
        id: existingOrderRow.id,
        status: existingOrderRow.status,
        size: existingOrderRow.variant,
        warehouseUrl: existingOrderRow.warehouse_order_id
          ? buildWarehouseTrackingUrl(existingOrderRow.warehouse_order_id)
          : null,
        rejectionNote: existingOrderRow.rejection_note,
      }
    : null;
  const isAmbassador = isAcceptedApplicationStatus(latestApp?.status);

  return (
    <main className="page-shell">
      <Navbar
        isAdmin={Boolean(user?.is_admin)}
        balanceCents={user?.balance_cents ?? 0}
        showBottomBorder={false}
      />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <header>
          <h1 className="text-4xl text-white">{t("heading")}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t("subheading")}</p>
        </header>

        {!user?.shirt_enabled ? (
          <p className="mt-8 font-body text-base text-white">{t("unavailable")}</p>
        ) : isAmbassador ? (
          <ShirtClient
            addresses={addresses}
            selectedAddressIndex={selectedAddressIndex}
            existingOrder={existingOrder}
          />
        ) : (
          <p className="mt-8 font-body text-base text-white">{t("not-ambassador")}</p>
        )}
      </div>
    </main>
  );
}

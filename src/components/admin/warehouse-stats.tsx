"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslations } from "next-intl";

type WarehouseStatsData = {
  expenditure: {
    contents: number;
    labor: number;
    postage: number;
    total: number;
  };
  completedOrders: number;
};

type PieSlice = {
  name: string;
  value: number;
  fill: string;
};

function isWarehouseStatsData(value: unknown): value is WarehouseStatsData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const expenditure = Reflect.get(value, "expenditure");
  const completedOrders = Reflect.get(value, "completedOrders");

  return (
    typeof expenditure === "object" &&
    expenditure !== null &&
    typeof Reflect.get(expenditure, "contents") === "number" &&
    typeof Reflect.get(expenditure, "labor") === "number" &&
    typeof Reflect.get(expenditure, "postage") === "number" &&
    typeof Reflect.get(expenditure, "total") === "number" &&
    typeof completedOrders === "number"
  );
}

export function WarehouseStats({ locale }: { locale: string }) {
  const t = useTranslations("admin.orders.warehouse");
  const [data, setData] = useState<WarehouseStatsData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch("/api/admin/warehouse-stats", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = await response.json() as unknown;
        if (!cancelled && isWarehouseStatsData(result)) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setHasLoaded(true);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const currencyFmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  if (!hasLoaded) {
    return <p className="font-body text-sm text-white/50">{t("crunching")}</p>;
  }

  if (data === null) {
    return null;
  }

  const pieData = [
    { name: t("contents"), value: data.expenditure.contents, fill: "var(--chart-applications)" },
    { name: t("labor"), value: data.expenditure.labor, fill: "var(--chart-signups)" },
    { name: t("postage"), value: data.expenditure.postage, fill: "var(--chart-approved)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-body text-sm text-secondary">{t("expenditure-label")}</p>
            <p className="text-2xl text-white">{currencyFmt.format(data.expenditure.total)}</p>
          </div>
          <div className="space-y-1 font-body text-sm text-white">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: "var(--chart-applications)" }} />
              <span>{t("contents")}</span>
              <span className="ml-auto">{currencyFmt.format(data.expenditure.contents)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: "var(--chart-signups)" }} />
              <span>{t("labor")}</span>
              <span className="ml-auto">{currencyFmt.format(data.expenditure.labor)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: "var(--chart-approved)" }} />
              <span>{t("postage")}</span>
              <span className="ml-auto">{currencyFmt.format(data.expenditure.postage)}</span>
            </div>
          </div>
          <p className="font-body text-xs text-white/50">
            {t("completed-orders", { count: data.completedOrders })}
          </p>
        </div>

        <div className="h-48 w-48 shrink-0">
          <ExpenditurePie data={pieData} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function ExpenditurePie({
  data,
  locale,
}: {
  data: PieSlice[];
  locale: string;
}) {
  const nonZero = data.filter((d) => d.value > 0);
  const chartData =
    nonZero.length > 0
      ? nonZero
      : [{ name: "empty", value: 1, fill: "var(--border)" }];

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={80}
          strokeWidth={0}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        {nonZero.length > 0 ? (
          <Tooltip
            content={
              <PieTooltip locale={locale} />
            }
          />
        ) : null}
      </PieChart>
    </ResponsiveContainer>
  );
}

function PieTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: { fill?: string };
  }>;
  locale: string;
}) {
  if (active !== true || payload === undefined || payload.length === 0) return null;

  const currencyFmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  return (
    <div className="border border-white/10 bg-card px-4 py-3">
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2 font-body text-sm text-white">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.payload?.fill ?? "var(--foreground)" }}
              />
              <span>{item.name}</span>
            </div>
            <span className="font-body text-sm text-white">
              {currencyFmt.format(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

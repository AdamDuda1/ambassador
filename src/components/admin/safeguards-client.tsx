"use client";

import Icon from "@hackclub/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import type { SafeguardKey } from "@/lib/safeguards";

type OverrideEntry = {
  userId: string;
  displayName: string;
  email: string | null;
};

type SafeguardControl = {
  key: SafeguardKey;
  title: string;
  description: string;
  enabled: boolean;
  enableAction: string;
  disableAction: string;
  overrides: OverrideEntry[];
};

type Strings = {
  columns: { toggle: string; flag: string; description: string };
  errorMessages: { update: string; override: string };
  overrides: {
    heading: string;
    empty: string;
    addLabel: string;
    addPlaceholder: string;
    addButton: string;
    removeLabel: string;
    removeConfirm: string;
    notFound: string;
    alreadyExists: string;
  };
};

export function SafeguardsClient({
  controls,
  columns,
  errorMessages,
  overrides: overridesStrings,
}: Strings & {
  controls: SafeguardControl[];
}) {
  const router = useRouter();
  const [states, setStates] = useState(() =>
    Object.fromEntries(controls.map((control) => [control.key, control.enabled])),
  );
  const [overrideLists, setOverrideLists] = useState(() =>
    Object.fromEntries(controls.map((control) => [control.key, control.overrides])),
  );
  const [pendingKey, setPendingKey] = useState<SafeguardKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addInputs, setAddInputs] = useState<Record<string, string>>({});
  const [addPending, setAddPending] = useState<SafeguardKey | null>(null);
  const [removePending, setRemovePending] = useState<string | null>(null);

  async function toggleSafeguard(control: SafeguardControl) {
    if (pendingKey !== null) return;

    const currentEnabled = states[control.key] ?? control.enabled;
    const nextEnabled = !currentEnabled;
    setPendingKey(control.key);
    setError(null);
    setStates((current) => ({ ...current, [control.key]: nextEnabled }));

    try {
      const response = await fetch("/api/admin/safeguards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: control.key,
          enabled: nextEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update safeguard");
      }

      router.refresh();
    } catch {
      setStates((current) => ({ ...current, [control.key]: currentEnabled }));
      setError(errorMessages.update);
    } finally {
      setPendingKey(null);
    }
  }

  async function addOverride(control: SafeguardControl) {
    const identifier = (addInputs[control.key] ?? "").trim();
    if (identifier === "" || addPending !== null) return;

    setAddPending(control.key);
    setError(null);
    try {
      const response = await fetch("/api/admin/feature-flag-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagKey: control.key, identifier }),
      });

      if (response.status === 404) {
        setError(overridesStrings.notFound);
        return;
      }
      if (response.status === 409) {
        setError(overridesStrings.alreadyExists);
        return;
      }
      if (!response.ok) {
        throw new Error("Unable to add override");
      }

      const data = (await response.json()) as { override: OverrideEntry };
      setOverrideLists((current) => {
        const existing = current[control.key] ?? [];
        if (existing.some((entry) => entry.userId === data.override.userId)) {
          return current;
        }
        const next = [...existing, data.override].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        );
        return { ...current, [control.key]: next };
      });
      setAddInputs((current) => ({ ...current, [control.key]: "" }));
      router.refresh();
    } catch {
      setError(errorMessages.override);
    } finally {
      setAddPending(null);
    }
  }

  async function removeOverride(control: SafeguardControl, userId: string) {
    if (removePending !== null) return;
    if (!window.confirm(overridesStrings.removeConfirm)) return;

    const removeKey = `${control.key}:${userId}`;
    setRemovePending(removeKey);
    setError(null);
    try {
      const response = await fetch("/api/admin/feature-flag-overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagKey: control.key, userId }),
      });
      if (!response.ok) {
        throw new Error("Unable to remove override");
      }
      setOverrideLists((current) => ({
        ...current,
        [control.key]: (current[control.key] ?? []).filter((entry) => entry.userId !== userId),
      }));
      router.refresh();
    } catch {
      setError(errorMessages.override);
    } finally {
      setRemovePending(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto border border-white/10 bg-card p-3 md:p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white">
              <th className="px-5 py-4 font-body text-base text-secondary">{columns.flag}</th>
              <th className="px-5 py-4 font-body text-base text-secondary">{columns.description}</th>
              <th className="px-5 py-4 font-body text-base text-secondary text-center">{columns.toggle}</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((control) => {
              const enabled = states[control.key] ?? control.enabled;
              const pending = pendingKey === control.key;
              const overridesList = overrideLists[control.key] ?? [];
              const addValue = addInputs[control.key] ?? "";
              const addingThis = addPending === control.key;

              return (
                <tr key={control.key} className="border-b border-white last:border-b-0 align-top">
                  <td className="px-5 py-4 font-body text-base text-white">
                    <div>{control.title}</div>
                    <div className="mt-4 space-y-2">
                      <div className="text-lg text-foreground">
                        {overridesStrings.heading}
                      </div>
                      {overridesList.length === 0 ? (
                        <div className="font-body text-sm text-secondary">{overridesStrings.empty}</div>
                      ) : (
                        <ul className="space-y-1 border-l border-white/20 pl-3">
                          {overridesList.map((entry) => {
                            const removeKey = `${control.key}:${entry.userId}`;
                            const removing = removePending === removeKey;
                            return (
                              <li
                                key={entry.userId}
                                className="flex items-center gap-2 font-body text-sm text-white"
                              >
                                <span className="text-secondary">└</span>
                                <a
                                  href={`/admin/users/${entry.userId}`}
                                  className="hover:underline"
                                >
                                  {entry.displayName}
                                </a>
                                {entry.email ? (
                                  <span className="text-secondary">({entry.email})</span>
                                ) : null}
                                <button
                                  type="button"
                                  aria-label={overridesStrings.removeLabel}
                                  title={overridesStrings.removeLabel}
                                  disabled={removing || removePending !== null}
                                  onClick={() => void removeOverride(control, entry.userId)}
                                  className="inline-flex h-5 w-5 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 text-foreground outline-none transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Icon glyph="delete" size={16} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <form
                        className="flex items-center gap-2 pt-1"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void addOverride(control);
                        }}
                      >
                        <Input
                          name={`identifier-${control.key}`}
                          aria-label={overridesStrings.addLabel}
                          placeholder={overridesStrings.addPlaceholder}
                          value={addValue}
                          onChange={(event) =>
                            setAddInputs((current) => ({
                              ...current,
                              [control.key]: event.target.value,
                            }))
                          }
                          className="ui-input-surface !bg-muted h-9 max-w-xs !rounded-none [border-radius:0!important] border-0 px-3 font-body text-sm font-normal text-foreground placeholder:text-foreground/40 hover:!bg-muted md:text-sm"
                          disabled={addingThis}
                        />
                        <button
                          type="submit"
                          className={buttonVariants({ size: "app-sm" })}
                          disabled={addingThis || addValue.trim() === ""}
                          aria-label={overridesStrings.addLabel}
                          title={overridesStrings.addLabel}
                        >
                          <Icon glyph="plus" size={16} />
                          <span className="ml-1">{overridesStrings.addButton}</span>
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-body text-sm text-foreground">{control.description}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      data-slot="icon-link"
                      aria-label={enabled ? control.disableAction : control.enableAction}
                      title={enabled ? control.disableAction : control.enableAction}
                      className="inline-flex cursor-pointer appearance-none border-0 bg-transparent p-0 text-base leading-none outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ color: enabled ? "var(--acceptance)" : "var(--primary)" }}
                      disabled={pending || pendingKey !== null}
                      onClick={() => void toggleSafeguard(control)}
                    >
                      {enabled ? "●" : "○"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error ? <p className="font-body text-sm text-primary">{error}</p> : null}
    </>
  );
}

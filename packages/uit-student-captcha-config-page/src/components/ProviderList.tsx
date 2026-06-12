// Ordered provider list = the fallback chain (index 0 = primary). Reorder/delete/edit
// produce a new providers array passed up to App. See contracts/config-ui.contract.md §A.

import type { ProviderEntry } from "@/config/schema";
import { ProviderCard } from "./ProviderCard";

export interface ProviderListProps {
  providers: readonly ProviderEntry[];
  onChange: (providers: ProviderEntry[]) => void;
}

export function ProviderList({ providers, onChange }: ProviderListProps) {
  function replaceAt(index: number, next: ProviderEntry): void {
    onChange(providers.map((p, i) => (i === index ? next : p)));
  }

  function move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= providers.length) return;
    const next = [...providers];
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    onChange(next);
  }

  function remove(index: number): void {
    onChange(providers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {providers.map((entry, index) => (
        <ProviderCard
          key={entry.id}
          entry={entry}
          index={index}
          total={providers.length}
          onChange={(next) => replaceAt(index, next)}
          onMove={(direction) => move(index, direction)}
          onDelete={() => remove(index)}
        />
      ))}
    </div>
  );
}

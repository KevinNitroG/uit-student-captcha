// Global settings — currently the per-attempt timeout (clamped on save by
// validateConfig). See contracts/config-ui.contract.md §A.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface GlobalSettingsProps {
  timeoutMs: number;
  onChange: (timeoutMs: number) => void;
}

export function GlobalSettings({ timeoutMs, onChange }: GlobalSettingsProps) {
  return (
    <section className="space-y-1">
      <Label htmlFor="timeoutMs">Per-attempt timeout (ms)</Label>
      <Input
        id="timeoutMs"
        type="number"
        value={timeoutMs}
        onChange={(e) => onChange(Number(e.target.value))}
        className="max-w-40"
      />
    </section>
  );
}

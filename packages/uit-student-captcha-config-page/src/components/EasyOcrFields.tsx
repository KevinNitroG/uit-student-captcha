// EasyOCR sub-form: variant (free/keyed), endpoint, and a conditional access key.
// See contracts/config-ui.contract.md §A.

import type { EasyOcrEntry } from "@/config/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EasyOcrFieldsProps {
  entry: EasyOcrEntry;
  onChange: (next: EasyOcrEntry) => void;
}

export function EasyOcrFields({ entry, onChange }: EasyOcrFieldsProps) {
  const keyMissing = entry.variant === "keyed" && !entry.accessKey;
  return (
    <div className="space-y-3">
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Variant</legend>
        <label className="mr-4 inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`${entry.id}-variant`}
            checked={entry.variant === "free"}
            onChange={() => onChange({ ...entry, variant: "free" })}
          />
          Free — no key
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`${entry.id}-variant`}
            checked={entry.variant === "keyed"}
            onChange={() => onChange({ ...entry, variant: "keyed" })}
          />
          Keyed console
        </label>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor={`${entry.id}-endpoint`}>Endpoint</Label>
        <Input
          id={`${entry.id}-endpoint`}
          value={entry.endpoint}
          onChange={(e) => onChange({ ...entry, endpoint: e.target.value })}
        />
      </div>

      {entry.variant === "keyed" && (
        <div className="space-y-1">
          <Label htmlFor={`${entry.id}-accessKey`}>
            Access key {keyMissing && <span className="text-amber-600">⚠ required</span>}
          </Label>
          <Input
            id={`${entry.id}-accessKey`}
            type="password"
            value={entry.accessKey ?? ""}
            onChange={(e) => onChange({ ...entry, accessKey: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

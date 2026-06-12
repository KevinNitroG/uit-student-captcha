// OCR.space sub-form: a required API key plus collapsible Advanced options
// (scheme/method/inputMode/engine/language/flags). See contracts/config-ui.contract.md §A.

import type { OcrSpaceEntry } from "@/config/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface OcrSpaceFieldsProps {
  entry: OcrSpaceEntry;
  onChange: (next: OcrSpaceEntry) => void;
}

type FlagKey = "isOverlayRequired" | "detectOrientation" | "scale" | "isTable";
const FLAGS: ReadonlyArray<{ key: FlagKey; label: string }> = [
  { key: "detectOrientation", label: "detectOrientation" },
  { key: "scale", label: "scale" },
  { key: "isTable", label: "isTable" },
  { key: "isOverlayRequired", label: "overlay" },
];

export function OcrSpaceFields({ entry, onChange }: OcrSpaceFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`${entry.id}-apiKey`}>
          API key{" "}
          {!entry.apiKey && <span className="text-amber-600">⚠ required</span>}
        </Label>
        <Input
          id={`${entry.id}-apiKey`}
          type="password"
          value={entry.apiKey}
          onChange={(e) => onChange({ ...entry, apiKey: e.target.value })}
        />
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-sm text-muted-foreground underline">
          ▸ Advanced options
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Scheme</legend>
            {(["https", "http"] as const).map((s) => (
              <label key={s} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${entry.id}-scheme`}
                  checked={entry.scheme === s}
                  onChange={() => onChange({ ...entry, scheme: s })}
                />
                {s}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Method</legend>
            {(["POST", "GET"] as const).map((m) => (
              <label key={m} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${entry.id}-method`}
                  checked={entry.httpMethod === m}
                  onChange={() => onChange({ ...entry, httpMethod: m })}
                />
                {m}
              </label>
            ))}
          </fieldset>

          <div className="space-y-1">
            <Label htmlFor={`${entry.id}-input`}>Input</Label>
            <select
              id={`${entry.id}-input`}
              className="block rounded border px-2 py-1 text-sm"
              value={entry.inputMode}
              onChange={(e) =>
                onChange({ ...entry, inputMode: e.target.value as OcrSpaceEntry["inputMode"] })
              }
            >
              <option value="url">Image URL</option>
              <option value="base64">Base64</option>
              <option value="file">File</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${entry.id}-engine`}>OCR engine</Label>
            <select
              id={`${entry.id}-engine`}
              className="block rounded border px-2 py-1 text-sm"
              value={entry.ocrEngine}
              onChange={(e) =>
                onChange({ ...entry, ocrEngine: Number(e.target.value) as 1 | 2 | 3 })
              }
            >
              <option value={1}>1 — fast</option>
              <option value={2}>2 — all-round</option>
              <option value={3}>3 — best / handwriting</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${entry.id}-language`}>Language</Label>
            <Input
              id={`${entry.id}-language`}
              value={entry.language}
              onChange={(e) => onChange({ ...entry, language: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {FLAGS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Switch
                  checked={entry[key] ?? false}
                  onCheckedChange={(checked) => onChange({ ...entry, [key]: checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

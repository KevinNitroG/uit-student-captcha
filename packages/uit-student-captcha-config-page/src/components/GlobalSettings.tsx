// Global settings — per-attempt timeout and lowercase OCR result toggle.
// See contracts/config-ui.contract.md §A and 002-ocr-lowercase-option/contracts/.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface GlobalSettingsProps {
  timeoutMs: number;
  onChange: (timeoutMs: number) => void;
  lowercaseResult: boolean;
  onLowercaseChange: (v: boolean) => void;
}

export function GlobalSettings({ timeoutMs, onChange, lowercaseResult, onLowercaseChange }: GlobalSettingsProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="timeoutMs">Per-attempt timeout (ms)</Label>
        <Input
          id="timeoutMs"
          type="number"
          value={timeoutMs}
          onChange={(e) => onChange(Number(e.target.value))}
          className="max-w-40"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="lowercaseResult"
          checked={lowercaseResult}
          onCheckedChange={onLowercaseChange}
        />
        <div>
          <Label htmlFor="lowercaseResult">Lowercase OCR result</Label>
          <p className="text-xs text-muted-foreground">
            Converts the recognized text to lowercase before filling.
            Recommended — portal captchas are lowercase.
          </p>
        </div>
      </div>
    </section>
  );
}

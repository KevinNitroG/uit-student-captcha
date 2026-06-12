// EasyOCR sub-form: a required access key plus the (overridable) console endpoint.
// EasyOCR has no keyless endpoint — the key is sent as the X-Access-Key header.
// See contracts/config-ui.contract.md §A.

import type { EasyOcrEntry } from "@/config/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface EasyOcrFieldsProps {
  entry: EasyOcrEntry;
  onChange: (next: EasyOcrEntry) => void;
}

export function EasyOcrFields({ entry, onChange }: EasyOcrFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`${entry.id}-accessKey`}>
          Access key{" "}
          {!entry.accessKey && <span className="text-amber-600">⚠ required</span>}
        </Label>
        <Input
          id={`${entry.id}-accessKey`}
          type="password"
          placeholder="eocr_…"
          value={entry.accessKey ?? ""}
          onChange={(e) => onChange({ ...entry, accessKey: e.target.value })}
        />
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-sm text-muted-foreground underline">
          ▸ Advanced options
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-2">
          <Label htmlFor={`${entry.id}-endpoint`}>Endpoint</Label>
          <Input
            id={`${entry.id}-endpoint`}
            value={entry.endpoint}
            onChange={(e) => onChange({ ...entry, endpoint: e.target.value })}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

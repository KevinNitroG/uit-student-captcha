// One provider entry: enable toggle, reorder, delete, and the right sub-form chosen by
// the `provider` discriminant — the SPA's single switch (Constitution II, mirrors the
// model-side registry). See contracts/config-ui.contract.md §A.

import type { ProviderEntry } from "@/config/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EasyOcrFields } from "./EasyOcrFields";
import { OcrSpaceFields } from "./OcrSpaceFields";

export interface ProviderCardProps {
  entry: ProviderEntry;
  index: number;
  total: number;
  onChange: (next: ProviderEntry) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

function titleFor(entry: ProviderEntry): string {
  return entry.provider === "easyocr" ? "EasyOCR" : "OCR.space";
}

export function ProviderCard({
  entry,
  index,
  total,
  onChange,
  onMove,
  onDelete,
}: ProviderCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-3">
          <Switch
            aria-label="enabled"
            checked={entry.enabled}
            onCheckedChange={(checked) => onChange({ ...entry, enabled: checked })}
          />
          <CardTitle className="text-base">{titleFor(entry)}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label="move up" disabled={index === 0} onClick={() => onMove(-1)}>
            ▲
          </Button>
          <Button variant="ghost" size="sm" aria-label="move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            ▼
          </Button>
          <Button variant="ghost" size="sm" aria-label="delete" onClick={onDelete}>
            🗑
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entry.provider === "easyocr" ? (
          <EasyOcrFields entry={entry} onChange={onChange} />
        ) : (
          <OcrSpaceFields entry={entry} onChange={onChange} />
        )}
      </CardContent>
    </Card>
  );
}

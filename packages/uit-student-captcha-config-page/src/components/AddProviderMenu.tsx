// Append a default entry of the chosen kind. Adding a provider here = one button +
// a default factory (mirrors the model-side registry, Constitution II).

import type { EasyOcrEntry, OcrSpaceEntry, ProviderEntry } from "@/config/schema";
import { Button } from "@/components/ui/button";

export interface AddProviderMenuProps {
  onAdd: (entry: ProviderEntry) => void;
}

function newEasyOcr(): EasyOcrEntry {
  return {
    id: `easyocr-${Date.now()}`,
    provider: "easyocr",
    endpoint: "https://console.easyocr.org/api/ocr",
    enabled: true,
  };
}

function newOcrSpace(): OcrSpaceEntry {
  return {
    id: `ocrspace-${Date.now()}`,
    provider: "ocrspace",
    apiKey: "",
    scheme: "https",
    httpMethod: "POST",
    inputMode: "url",
    ocrEngine: 2,
    language: "eng",
    enabled: false,
  };
}

export function AddProviderMenu({ onAdd }: AddProviderMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Add provider:</span>
      <Button variant="outline" size="sm" onClick={() => onAdd(newEasyOcr())}>
        + EasyOCR
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAdd(newOcrSpace())}>
        + OCR.space
      </Button>
    </div>
  );
}

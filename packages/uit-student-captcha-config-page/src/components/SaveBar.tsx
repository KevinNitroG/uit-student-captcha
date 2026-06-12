// Save / Reset controls with a dirty indicator and the bridge ack/error result.
// See contracts/config-ui.contract.md §A.

import { Button } from "@/components/ui/button";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export interface SaveBarProps {
  dirty: boolean;
  state: SaveState;
  onSave: () => void;
  onReset: () => void;
}

export function SaveBar({ dirty, state, onSave, onReset }: SaveBarProps) {
  return (
    <div className="flex items-center gap-3 border-t pt-4">
      <Button onClick={onSave} disabled={!dirty}>
        Save
      </Button>
      <Button variant="outline" onClick={onReset}>
        Reset to defaults
      </Button>
      {state.kind === "saved" && <span className="text-sm text-green-700">✓ Saved</span>}
      {state.kind === "error" && (
        <span className="text-sm text-red-700">⚠ {state.message}</span>
      )}
      {dirty && state.kind === "idle" && (
        <span className="text-sm text-muted-foreground">Unsaved changes</span>
      )}
    </div>
  );
}

import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ResetConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventCount: number;
  onConfirm: () => void;
}

export function ResetConfirmDialog({
  open,
  onOpenChange,
  eventCount,
  onConfirm,
}: ResetConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>Reset calendar?</DialogTitle>
          <DialogDescription>
            This permanently deletes{" "}
            <span className="font-semibold text-foreground">
              all {eventCount} event{eventCount === 1 ? "" : "s"}
            </span>{" "}
            and starts you from a blank calendar. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="font-semibold"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            <Trash2 />
            Yes, delete everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

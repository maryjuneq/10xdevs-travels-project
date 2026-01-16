import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface GenerationModalProps {
  open: boolean;
  error?: string;
  onClose?: () => void;
}

function useElapsedTime(active: boolean): string {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export function GenerationModal({ open, error, onClose }: GenerationModalProps) {
  const elapsedTime = useElapsedTime(open && !error);

  const handleClose = () => {
    if (error && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} modal onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!!error}
        onPointerDownOutside={(e) => !error && e.preventDefault()}
        onEscapeKeyDown={(e) => !error && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {error ? (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                Generation Failed
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Your Itinerary
              </>
            )}
          </DialogTitle>
          <DialogDescription asChild>
            {error ? (
              <div className="space-y-2">
                <div className="text-destructive">{error}</div>
                <div className="text-sm">Please try again or adjust your trip details.</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>Our AI is crafting a personalized travel plan based on your preferences...</div>
                <div className="text-sm text-muted-foreground">
                  This usually takes 20-45 seconds. Elapsed time: <span className="font-mono">{elapsedTime}</span>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {!error && (
          <div className="flex justify-center py-6">
            <div className="space-y-4 w-full">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-full" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
              </div>
              <div className="text-xs text-center text-muted-foreground">
                Please do not close this window or navigate away
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


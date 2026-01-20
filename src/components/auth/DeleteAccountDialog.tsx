import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteAccountDialogProps {
  /** Trigger element, defaults to a button */
  trigger?: React.ReactNode;
  /** Callback when deletion is confirmed (optional, will call API if not provided) */
  onConfirm?: () => void | Promise<void>;
}

export function DeleteAccountDialog({ trigger, onConfirm }: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        setError("");

        // If custom onConfirm is provided, use it
        if (onConfirm) {
          await onConfirm();
          setOpen(false);
          return;
        }

        // Otherwise, call the delete API endpoint
        const response = await fetch("/api/auth/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to delete account. Please try again.");
          return;
        }

        // Account deleted successfully, redirect to login
        window.location.href = "/login";
      } catch (err) {
        console.error("Account deletion error:", err);
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Trash2 className="size-4" />
            Delete Account
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove all your data from our
            servers.
          </AlertDialogDescription>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="font-semibold text-destructive">
              All your trip notes, itineraries, and preferences will be permanently deleted.
            </div>
            {error && <div className="text-sm text-destructive font-medium">{error}</div>}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "Deleting..." : "Delete Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

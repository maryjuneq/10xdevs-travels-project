import * as React from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrimaryActionMode } from "@/types/view/tripNoteDetail";

export interface PrimaryActionButtonProps {
  mode: PrimaryActionMode;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function PrimaryActionButton({ mode, onClick, disabled = false, isLoading = false }: PrimaryActionButtonProps) {
  const isSaveAndGenerate = mode === "saveAndGenerate";

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full"
      size="lg"
    >
      {isSaveAndGenerate ? (
        <>
          <Sparkles className="mr-2 h-5 w-5" />
          {isLoading ? "Saving & Generating..." : "Save & Generate Itinerary"}
        </>
      ) : (
        <>
          <Save className="mr-2 h-5 w-5" />
          {isLoading ? "Saving..." : "Save Trip Note"}
        </>
      )}
    </Button>
  );
}


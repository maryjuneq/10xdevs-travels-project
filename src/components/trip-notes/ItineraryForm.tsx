import * as React from "react";
import { Edit3, Sparkles } from "lucide-react";
import type { LightItineraryDTO } from "@/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export interface ItineraryFormProps {
  itinerary?: LightItineraryDTO | null;
  onUpdate: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function ItineraryForm({ itinerary, onUpdate, disabled = false }: ItineraryFormProps) {
  const [manualEditMode, setManualEditMode] = React.useState(false);
  const [itineraryText, setItineraryText] = React.useState(itinerary?.itinerary || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const previousTextRef = React.useRef(itinerary?.itinerary || "");

  // Update internal state when itinerary prop changes
  React.useEffect(() => {
    if (itinerary?.itinerary !== undefined) {
      setItineraryText(itinerary.itinerary);
      previousTextRef.current = itinerary.itinerary;
    }
  }, [itinerary?.itinerary]);

  const handleBlur = async () => {
    // Only save if text has changed and we're in manual edit mode
    if (manualEditMode && itineraryText !== previousTextRef.current && itineraryText.trim()) {
      setIsSaving(true);
      try {
        await onUpdate(itineraryText);
        previousTextRef.current = itineraryText;
      } catch (error) {
        // Error handling is done at parent level
        console.error("Failed to update itinerary:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleManualEditToggle = (checked: boolean) => {
    setManualEditMode(checked);
    if (!checked) {
      // Reset to last saved value when disabling edit mode
      setItineraryText(previousTextRef.current);
    }
  };

  // No itinerary exists yet
  if (!itinerary) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Itinerary Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Save your trip note and click "Save & Generate Itinerary" to create an AI-powered travel plan based on your
          preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      {/* Header with Suggested Trip Length */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Generated Itinerary</Label>
          {itinerary.suggestedTripLength && (
            <Badge variant="secondary">
              {itinerary.suggestedTripLength} {itinerary.suggestedTripLength === 1 ? "day" : "days"}
            </Badge>
          )}
        </div>

        {/* Manual Edit Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="manual-edit"
            checked={manualEditMode}
            onCheckedChange={handleManualEditToggle}
            disabled={disabled || isSaving}
          />
          <Label htmlFor="manual-edit" className="font-normal cursor-pointer flex items-center gap-1">
            <Edit3 className="h-3 w-3" />
            Edit
          </Label>
        </div>
      </div>

      {/* Itinerary Text Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <Textarea
          value={itineraryText}
          onChange={(e) => setItineraryText(e.target.value)}
          onBlur={handleBlur}
          disabled={!manualEditMode || disabled || isSaving}
          className="flex-1 min-h-0 resize-none font-mono text-sm"
          placeholder="Your itinerary will appear here..."
          aria-label="Itinerary content"
        />
        {isSaving && (
          <p className="text-xs text-muted-foreground mt-2">Saving changes...</p>
        )}
        {manualEditMode && !isSaving && (
          <p className="text-xs text-muted-foreground mt-2">Changes will be saved automatically when you click outside the text area.</p>
        )}
      </div>
    </div>
  );
}


import * as React from "react";
import { Edit3, Sparkles, Save } from "lucide-react";
import type { LightItineraryDTO } from "@/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const handleSaveChanges = async () => {
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

  // Check if there are unsaved changes
  const hasUnsavedChanges = itineraryText !== previousTextRef.current;

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
      {/* Header with Suggested Trip Length and Budget */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-base font-semibold">Generated Itinerary</Label>
          {itinerary.suggestedTripLength && itinerary.suggestedTripLength > 0 && (
            <Badge variant="secondary">
              {itinerary.suggestedTripLength} {itinerary.suggestedTripLength === 1 ? "day" : "days"}
            </Badge>
          )}
          {itinerary.suggestedBudget && itinerary.suggestedBudget.trim() !== "" && (
            <Badge variant="outline">{itinerary.suggestedBudget}</Badge>
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
          disabled={!manualEditMode || disabled || isSaving}
          className="flex-1 min-h-0 resize-none font-mono text-sm"
          placeholder="Your itinerary will appear here..."
          aria-label="Itinerary content"
        />

        {/* Save Changes Button - only visible when Edit mode is on */}
        {manualEditMode && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              {isSaving && <p className="text-xs text-muted-foreground">Saving changes...</p>}
              {!isSaving && hasUnsavedChanges && (
                <p className="text-xs text-muted-foreground">You have unsaved changes</p>
              )}
            </div>
            <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges || isSaving || disabled} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

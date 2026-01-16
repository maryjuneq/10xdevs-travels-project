import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { QueryClientProvider } from "@/components/QueryClientProvider";
import type { CreateTripNoteCommand } from "@/types";
import type { PrimaryActionMode, GenerationState } from "@/types/view/tripNoteDetail";
import { useTripNote } from "@/components/hooks/useTripNoteDetail";
import { useUnsavedPrompt } from "@/components/hooks/useUnsavedPrompt";
import { NoteForm } from "@/components/trip-notes/NoteForm";
import { PrimaryActionButton } from "@/components/trip-notes/PrimaryActionButton";
import { ItineraryForm } from "@/components/trip-notes/ItineraryForm";
import { GenerationModal } from "@/components/trip-notes/GenerationModal";
import { Toaster } from "@/components/ui/sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TripNoteDetailPageProps {
  id: string;
}

function TripNoteDetailPageContent({ id }: TripNoteDetailPageProps) {
  const noteId = parseInt(id, 10);
  const isNewNote = isNaN(noteId) || noteId === 0;

  const {
    data: tripNote,
    isLoading,
    error,
    save,
    generate,
    updateItinerary,
    isSaving,
    isGenerating,
    isUpdatingItinerary,
    saveError,
    generateError,
  } = useTripNote(isNewNote ? 0 : noteId);

  // Local state
  const [shouldGenerateAfterSave, setShouldGenerateAfterSave] = React.useState(false);
  const [generationState, setGenerationState] = React.useState<GenerationState>({
    isGenerating: false,
    error: undefined,
  });
  const [currentNoteId, setCurrentNoteId] = React.useState<number | null>(isNewNote ? null : noteId);
  const [isDirty, setIsDirty] = React.useState(false);

  // Warn user about unsaved changes
  useUnsavedPrompt(isDirty && !isSaving);

  // Update document title
  React.useEffect(() => {
    const title = isNewNote
      ? "New Trip Note | Travel Planner"
      : tripNote?.destination
        ? `${tripNote.destination} | Travel Planner`
        : "Trip Note | Travel Planner";
    document.title = title;
  }, [isNewNote, tripNote?.destination]);

  // Update generation state when generating
  React.useEffect(() => {
    if (isGenerating) {
      setGenerationState({
        isGenerating: true,
        error: undefined,
        startTime: Date.now(),
      });
    } else {
      setGenerationState((prev) => ({
        ...prev,
        isGenerating: false,
      }));
    }
  }, [isGenerating]);

  // Handle generation errors
  React.useEffect(() => {
    if (generateError) {
      setGenerationState((prev) => ({
        ...prev,
        error: generateError.message || "Failed to generate itinerary",
      }));
    }
  }, [generateError]);

  // Determine primary action mode
  const getPrimaryActionMode = (): PrimaryActionMode => {
    // For new notes (no currentNoteId yet), always just save first
    if (!currentNoteId) {
      return "save";
    }
    // After first save, show "saveAndGenerate" if toggle is on
    return shouldGenerateAfterSave ? "saveAndGenerate" : "save";
  };

  const handleSaveNote = async (values: CreateTripNoteCommand) => {
    try {
      const result = await save(values);
      
      // Mark as not dirty after successful save
      setIsDirty(false);
      
      const wasNewNote = !currentNoteId;
      
      // Update current note ID if this was a new note
      if (wasNewNote) {
        setCurrentNoteId(result.id);
        // Redirect to the detail view with the new ID
        window.history.replaceState({}, "", `/trip-notes/${result.id}`);
        toast.success("Trip note created successfully!");
      } else {
        toast.success("Trip note updated successfully!");
      }

      // If should generate after save, trigger generation
      if (shouldGenerateAfterSave && result.id) {
        await handleGenerateItinerary(result.id, values);
      }
    } catch (err) {
      console.error("Failed to save trip note:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save trip note";
      toast.error(errorMessage);
    }
  };

  const handleGenerateItinerary = async (id: number, values: CreateTripNoteCommand) => {
    try {
      await generate(id, values);
      setGenerationState({
        isGenerating: false,
        error: undefined,
      });
      toast.success("Itinerary generated successfully!");
    } catch (err) {
      console.error("Failed to generate itinerary:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate itinerary";
      setGenerationState({
        isGenerating: false,
        error: errorMessage,
      });
      // Toast will be shown when user dismisses the modal
    }
  };

  const handleUpdateItinerary = async (text: string) => {
    if (!tripNote?.itinerary?.id) return;
    try {
      await updateItinerary(tripNote.itinerary.id, text);
      toast.success("Itinerary updated successfully!");
    } catch (err) {
      console.error("Failed to update itinerary:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update itinerary";
      toast.error(errorMessage);
    }
  };

  // No longer needed - form submission is triggered directly

  const closeGenerationModal = () => {
    if (!isGenerating) {
      setGenerationState({
        isGenerating: false,
        error: undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trip note...</p>
        </div>
      </div>
    );
  }

  if (error && !isNewNote) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Trip Note Not Found</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => (window.location.href = "/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const primaryActionMode = getPrimaryActionMode();
  const canGenerate = currentNoteId !== null; // Show generate toggle after first save

  return (
    <div className="flex flex-col h-screen">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b bg-background px-6 py-4" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/")}
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back
            </Button>
            <h1 className="text-2xl font-bold" id="page-title">
              {isNewNote ? "New Trip Note" : tripNote?.destination || "Trip Note Details"}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-hidden" role="main" aria-labelledby="page-title">
        <ResizablePanelGroup orientation="horizontal" id="trip-note-layout">
          {/* Note Form Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full overflow-auto" role="region" aria-label="Trip note form">
              <NoteForm
                initialValues={tripNote || undefined}
                onSubmit={handleSaveNote}
                onDirtyChange={setIsDirty}
                disabled={isSaving || isGenerating}
              >
                {({ handleSubmit, isValid }) => (
                  <>
                    {/* Generate Itinerary Switch - only show after first save */}
                    {canGenerate && (
                      <div className="flex items-center space-x-2 mb-4">
                        <Switch
                          id="generate-after-save"
                          checked={shouldGenerateAfterSave}
                          onCheckedChange={setShouldGenerateAfterSave}
                          disabled={isSaving || isGenerating}
                        />
                        <Label htmlFor="generate-after-save" className="font-normal cursor-pointer">
                          Generate itinerary after saving
                        </Label>
                      </div>
                    )}

                    {/* Primary Action Button */}
                    <PrimaryActionButton
                      mode={primaryActionMode}
                      onClick={handleSubmit}
                      disabled={!isValid || isSaving || isGenerating}
                      isLoading={isSaving || isGenerating}
                    />
                  </>
                )}
              </NoteForm>
            </div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle />

          {/* Itinerary Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full overflow-auto bg-muted/30" role="region" aria-label="Generated itinerary">
              <ItineraryForm
                itinerary={tripNote?.itinerary}
                onUpdate={handleUpdateItinerary}
                disabled={isUpdatingItinerary}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* Generation Modal */}
      <GenerationModal
        open={generationState.isGenerating || !!generationState.error}
        error={generationState.error}
        onClose={() => {
          if (generationState.error) {
            toast.error(generationState.error);
          }
          setGenerationState({
            isGenerating: false,
            error: undefined,
          });
        }}
      />

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function TripNoteDetailPage(props: TripNoteDetailPageProps) {
  return (
    <QueryClientProvider>
      <TripNoteDetailPageContent {...props} />
    </QueryClientProvider>
  );
}


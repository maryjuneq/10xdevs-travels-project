/**
 * PreferencesGrid Component
 * Main container for managing user preferences with inline editing
 */

import { useState, useRef, useCallback } from "react";
import { usePreferences, useCreatePreference, useUpdatePreference, useDeletePreference } from "../hooks/usePreferences";
import type { UserPreferenceDTO, PreferenceCategory } from "../../types";
import { toast } from "sonner";
import { PreferenceTile } from "./PreferenceTile";
import { AddPreferenceCard } from "./AddPreferenceCard";
import { ConfirmationDialog } from "./ConfirmationDialog";

// View model type for preferences (includes temp state)
export interface PreferenceVM extends Omit<UserPreferenceDTO, "id"> {
  id: number | string;
  isNew?: boolean;
  isSaving?: boolean;
}

// Form values type for inline editing
export interface PreferenceFormValues {
  category: PreferenceCategory;
  preferenceText: string;
}

export function PreferencesGrid() {
  const { data: preferences, isLoading, error } = usePreferences();
  const createMutation = useCreatePreference();
  const updateMutation = useUpdatePreference();
  const deleteMutation = useDeletePreference();

  // State for which tile is currently being edited
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // State for temp preferences (newly added, not yet saved)
  const [tempPreferences, setTempPreferences] = useState<PreferenceVM[]>([]);

  // State for delete confirmation dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    preferenceId: number | string | null;
  }>({
    open: false,
    preferenceId: null,
  });

  // Refs for focus management
  const tileRefs = useRef<Map<number | string, HTMLDivElement>>(new Map());

  // Combine server preferences with temp preferences
  const allPreferences: PreferenceVM[] = [
    ...(preferences || []).map((p) => ({ ...p, isNew: false, isSaving: false })),
    ...tempPreferences,
  ];

  // Handle adding a new preference tile
  const handleAdd = useCallback(() => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newPreference: PreferenceVM = {
      id: tempId,
      category: "other",
      preferenceText: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isNew: true,
      isSaving: false,
    };

    setTempPreferences((prev) => [...prev, newPreference]);
    setEditingId(tempId);

    // Focus the new tile after render
    setTimeout(() => {
      const tileElement = tileRefs.current.get(tempId);
      if (tileElement) {
        const textarea = tileElement.querySelector("textarea");
        textarea?.focus();
      }
    }, 0);
  }, []);

  // Handle saving a preference (create or update)
  const handleSave = useCallback(
    async (id: number | string, values: PreferenceFormValues) => {
      const preference = allPreferences.find((p) => p.id === id);
      if (!preference) return;

      try {
        if (preference.isNew) {
          // Create new preference
          await createMutation.mutateAsync({
            category: values.category,
            preferenceText: values.preferenceText,
          });

          // Remove from temp preferences on success
          setTempPreferences((prev) => prev.filter((p) => p.id !== id));
          toast.success("Preference created successfully");
        } else {
          // Update existing preference
          await updateMutation.mutateAsync({
            id: id as number,
            updates: {
              category: values.category,
              preferenceText: values.preferenceText,
            },
          });
          toast.success("Preference updated successfully");
        }

        setEditingId(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save preference";
        toast.error(message);

        // Remove temp preference if creation failed
        if (preference.isNew) {
          setTempPreferences((prev) => prev.filter((p) => p.id !== id));
        }
      }
    },
    [allPreferences, createMutation, updateMutation]
  );

  // Handle canceling edit
  const handleCancel = useCallback(
    (id: number | string) => {
      const preference = allPreferences.find((p) => p.id === id);

      if (preference?.isNew) {
        // Remove temp preference
        setTempPreferences((prev) => prev.filter((p) => p.id !== id));
      }

      setEditingId(null);
    },
    [allPreferences]
  );

  // Handle opening delete confirmation
  const handleDeleteClick = useCallback((id: number | string) => {
    setDeleteConfirmation({
      open: true,
      preferenceId: id,
    });
  }, []);

  // Handle confirmed deletion
  const handleDeleteConfirmed = useCallback(async () => {
    const id = deleteConfirmation.preferenceId;
    if (!id) return;

    const preference = allPreferences.find((p) => p.id === id);
    if (!preference) return;

    // Close dialog first
    setDeleteConfirmation({ open: false, preferenceId: null });

    // Don't allow deleting unsaved preferences through API
    if (preference.isNew) {
      handleCancel(id);
      return;
    }

    try {
      await deleteMutation.mutateAsync(id as number);
      toast.success("Preference deleted successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete preference";
      toast.error(message);
    }
  }, [deleteConfirmation.preferenceId, allPreferences, deleteMutation, handleCancel]);

  // Handle entering edit mode
  const handleEnterEdit = useCallback((id: number | string) => {
    setEditingId(id);

    // Focus the textarea after render
    setTimeout(() => {
      const tileElement = tileRefs.current.get(id);
      if (tileElement) {
        const textarea = tileElement.querySelector("textarea");
        textarea?.focus();
      }
    }, 0);
  }, []);

  // Handle keyboard navigation across grid
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent, currentId: number | string) => {
      // Don't handle navigation if currently editing
      if (editingId !== null) return;

      const currentIndex = allPreferences.findIndex((p) => p.id === currentId);
      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      const cols = 4; // Grid columns at xl breakpoint (adjust based on screen)

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          targetIndex = Math.min(currentIndex + 1, allPreferences.length - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          targetIndex = Math.max(currentIndex - 1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          targetIndex = Math.min(currentIndex + cols, allPreferences.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          targetIndex = Math.max(currentIndex - cols, 0);
          break;
        case "Delete":
          e.preventDefault();
          handleDeleteClick(currentId);
          return;
        default:
          return;
      }

      // Focus the target tile
      if (targetIndex !== currentIndex) {
        const targetId = allPreferences[targetIndex].id;
        const targetElement = tileRefs.current.get(targetId);
        if (targetElement) {
          // Find the focusable element within the tile
          const focusable = targetElement.querySelector<HTMLElement>('[tabindex="0"]');
          focusable?.focus();
        }
      }
    },
    [editingId, allPreferences, handleDeleteClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading preferences">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-4">Failed to load preferences</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (allPreferences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">No preferences yet</h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Add your travel preferences to help the AI create personalized itineraries tailored to your interests.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 transition-colors"
        >
          Add Your First Preference
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid of preference tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allPreferences.map((preference) => (
          <div
            key={preference.id}
            ref={(el) => {
              if (el) {
                tileRefs.current.set(preference.id, el);
              } else {
                tileRefs.current.delete(preference.id);
              }
            }}
          >
            <PreferenceTile
              preference={preference}
              isEditing={editingId === preference.id}
              onEnterEdit={() => handleEnterEdit(preference.id)}
              onSave={(values) => handleSave(preference.id, values)}
              onCancel={() => handleCancel(preference.id)}
              onDelete={() => handleDeleteClick(preference.id)}
              onKeyDown={(e) => handleGridKeyDown(e, preference.id)}
            />
          </div>
        ))}

        {/* Add preference card */}
        <AddPreferenceCard onAdd={handleAdd} />
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => setDeleteConfirmation({ open, preferenceId: null })}
        onConfirm={handleDeleteConfirmed}
        title="Delete Preference"
        description="Are you sure you want to delete this preference? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

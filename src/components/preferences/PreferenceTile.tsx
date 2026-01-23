/**
 * PreferenceTile Component
 * Displays a preference in view mode or inline edit mode
 */

import { useState, useEffect, useRef } from "react";
import type { PreferenceCategory } from "../../types";
import type { PreferenceVM, PreferenceFormValues } from "./PreferencesGrid";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface PreferenceTileProps {
  preference: PreferenceVM;
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: (values: PreferenceFormValues) => void;
  onCancel: () => void;
  onDelete: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

// Category icons mapping
const categoryIcons: Record<PreferenceCategory, string> = {
  food: "🍽️",
  culture: "🎭",
  adventure: "🏔️",
  nature: "🌲",
  other: "📝",
};

// Category labels for select
const categoryLabels: Record<PreferenceCategory, string> = {
  food: "Food & Dining",
  culture: "Culture & Arts",
  adventure: "Adventure",
  nature: "Nature",
  other: "Other",
};

export function PreferenceTile({
  preference,
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
  onDelete,
  onKeyDown,
}: PreferenceTileProps) {
  const [formValues, setFormValues] = useState<PreferenceFormValues>({
    category: preference.category,
    preferenceText: preference.preferenceText,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form values when preference changes or editing starts
  useEffect(() => {
    if (isEditing) {
      setFormValues({
        category: preference.category,
        preferenceText: preference.preferenceText,
      });
      setValidationError(null);
    }
  }, [isEditing, preference.category, preference.preferenceText]);

  // Validate form values
  const validate = (): boolean => {
    const text = formValues.preferenceText.trim();

    if (text.length === 0) {
      setValidationError("Preference text is required");
      return false;
    }

    if (text.length < 3) {
      setValidationError("Preference text must be at least 3 characters");
      return false;
    }

    if (text.length > 200) {
      setValidationError("Preference text must be at most 200 characters");
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Handle save click
  const handleSave = () => {
    if (!validate()) return;

    onSave({
      category: formValues.category,
      preferenceText: formValues.preferenceText.trim(),
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setValidationError(null);
    onCancel();
  };

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // Check if form is valid
  const isValid = formValues.preferenceText.trim().length >= 3 && formValues.preferenceText.trim().length <= 200;

  // View mode
  if (!isEditing) {
    return (
      <div
        tabIndex={0}
        onClick={onEnterEdit}
        onKeyDown={(e) => {
          // Handle tile-specific keys first
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEnterEdit();
            return;
          }
          // Pass through to grid navigation handler (includes Delete, arrow keys)
          onKeyDown?.(e);
        }}
        className="relative group border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:border-primary/50 h-[200px] flex flex-col"
        role="button"
        aria-label={`Edit preference: ${preference.preferenceText}`}
      >
        {/* Category icon and label */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden="true">
            {categoryIcons[preference.category]}
          </span>
          <span className="text-sm font-medium text-foreground">{categoryLabels[preference.category]}</span>
        </div>

        {/* Preference text */}
        <p className="text-card-foreground text-sm leading-relaxed flex-1 overflow-auto">{preference.preferenceText}</p>

        {/* Delete button (visible on hover/focus) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-destructive/10 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-destructive transition-all"
          aria-label="Delete preference"
          type="button"
        >
          <svg
            className="w-4 h-4 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>

        {/* Saving indicator */}
        {preference.isSaving && (
          <div className="absolute inset-0 bg-card/80 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" aria-label="Saving" />
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="border-2 border-primary rounded-lg p-4 bg-card shadow-md">
      <div className="space-y-4">
        {/* Category select */}
        <div className="space-y-1.5">
          <label htmlFor={`category-${preference.id}`} className="text-sm font-medium text-foreground">
            Category
          </label>
          <Select
            value={formValues.category}
            onValueChange={(value) => setFormValues({ ...formValues, category: value as PreferenceCategory })}
          >
            <SelectTrigger id={`category-${preference.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <span>{categoryIcons[value as PreferenceCategory]}</span>
                    <span>{label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preference text textarea */}
        <div className="space-y-1.5">
          <label htmlFor={`text-${preference.id}`} className="text-sm font-medium text-foreground">
            Preference <span className="text-muted-foreground font-normal">(3-200 characters)</span>
          </label>
          <Textarea
            ref={textareaRef}
            id={`text-${preference.id}`}
            value={formValues.preferenceText}
            onChange={(e) => {
              setFormValues({ ...formValues, preferenceText: e.target.value });
              // Clear validation error on change
              if (validationError) setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="E.g., I prefer vegetarian restaurants"
            className="min-h-[100px] resize-none"
            maxLength={200}
            aria-describedby={validationError ? `error-${preference.id}` : undefined}
            aria-invalid={!isValid}
          />
          <div className="flex justify-between items-center text-xs">
            <span className={validationError ? "text-destructive" : "text-muted-foreground"}>
              {validationError || `${formValues.preferenceText.length}/200 characters`}
            </span>
            <span className="text-muted-foreground hidden sm:inline">Ctrl+Enter to save, Esc to cancel</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary border border-border rounded-md hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            type="button"
          >
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">❌</span>
              <span>Cancel</span>
            </span>
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">✅</span>
              <span>Save</span>
            </span>
          </button>
        </div>
      </div>

      {/* Saving indicator */}
      {preference.isSaving && (
        <div className="absolute inset-0 bg-card/80 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" aria-label="Saving" />
        </div>
      )}
    </div>
  );
}

/**
 * AddPreferenceCard Component
 * Visual placeholder tile with "+" icon for adding new preferences
 */

interface AddPreferenceCardProps {
  onAdd: () => void;
}

export function AddPreferenceCard({ onAdd }: AddPreferenceCardProps) {
  return (
    <button
      onClick={onAdd}
      className="h-[200px] border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-accent transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      type="button"
      aria-label="Add new preference"
    >
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center transition-colors">
        <svg
          className="w-6 h-6 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-sm font-medium text-muted-foreground">Add Preference</span>
    </button>
  );
}

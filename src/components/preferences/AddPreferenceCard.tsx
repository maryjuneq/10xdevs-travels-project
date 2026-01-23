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
      className="h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
      type="button"
      aria-label="Add new preference"
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors">
        <svg
          className="w-6 h-6 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Add Preference</span>
    </button>
  );
}

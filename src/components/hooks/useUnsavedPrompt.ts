/**
 * Hook to prompt user before navigating away with unsaved changes
 * Uses native browser beforeunload event for external navigation
 */

import * as React from "react";

export function useUnsavedPrompt(
  isDirty: boolean,
  message = "You have unsaved changes. Are you sure you want to leave?"
) {
  React.useEffect(() => {
    if (!isDirty) return;

    // Handle browser navigation (close tab, refresh, external navigation)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but we still need to set returnValue
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);

  // For internal navigation (SPA), we would use React Router's useBlocker
  // Since this is an Astro app with mostly page-based routing, the beforeunload is sufficient
}

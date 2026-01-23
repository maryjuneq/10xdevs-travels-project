/**
 * PreferencesWrapper Component
 * Wraps PreferencesGrid with QueryClientProvider
 * This ensures they're in the same React tree for proper context sharing
 */

import { QueryClientProvider } from "../QueryClientProvider";
import { PreferencesGrid } from "./PreferencesGrid";

export function PreferencesWrapper() {
  return (
    <QueryClientProvider>
      <PreferencesGrid />
    </QueryClientProvider>
  );
}

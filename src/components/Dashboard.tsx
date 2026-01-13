/**
 * Dashboard Wrapper Component
 * Wraps DashboardView with QueryClientProvider to ensure proper React Query context
 */

import { QueryClientProvider } from "./QueryClientProvider";
import { DashboardView } from "./DashboardView";

/**
 * Main Dashboard component that includes the QueryClient provider
 * This ensures DashboardView has access to the React Query context
 */
export function Dashboard() {
  return (
    <QueryClientProvider>
      <DashboardView />
    </QueryClientProvider>
  );
}


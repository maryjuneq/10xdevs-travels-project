/**
 * Dashboard Header Component
 * Displays page title and primary action buttons
 */

import { Button } from "../ui/button";

/**
 * Header section for the dashboard
 * Contains title and action buttons for creating notes and managing preferences
 */
export function DashboardHeader() {
  return (
    <div className="mb-8 flex items-center justify-between">
      {/* Page Title */}
      <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Manage Preferences Button (Secondary) */}
        <Button variant="outline" asChild>
          <a href="/preferences">Manage Preferences</a>
        </Button>

        {/* Add Note Button (Primary) */}
        <Button asChild>
          <a href="/trip-notes/new">Add Note</a>
        </Button>
      </div>
    </div>
  );
}

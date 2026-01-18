/**
 * Dashboard Header Component
 * Displays page title and primary action buttons
 */

import { useState } from "react";
import { Button } from "../ui/button";

/**
 * Header section for the dashboard
 * Contains title and action buttons for creating notes and managing preferences
 */
export function DashboardHeader() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Redirect to login page
        window.location.href = "/login";
      } else {
        console.error("Logout failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

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

        {/* Logout Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}

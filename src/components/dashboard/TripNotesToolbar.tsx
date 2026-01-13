/**
 * Trip Notes Toolbar Component
 * Provides filtering and sorting controls for the trip notes list
 */

import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import type { TripNotesListQuery } from "../../types";

interface TripNotesToolbarProps {
  filters: TripNotesListQuery;
  onFilterChange: (updates: Partial<TripNotesListQuery>) => void;
}

/**
 * Sort options for the select dropdown
 */
const SORT_OPTIONS: { value: NonNullable<TripNotesListQuery["sort"]>; label: string }[] = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "destination", label: "Destination (A-Z)" },
  { value: "-destination", label: "Destination (Z-A)" },
  { value: "earliest_start_date", label: "Start Date (Earliest)" },
  { value: "-earliest_start_date", label: "Start Date (Latest)" },
];

/**
 * Formats date to display format (e.g., "Jan 15, 2026")
 */
function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Toolbar component with all filter and sort controls
 */
export function TripNotesToolbar({ filters, onFilterChange }: TripNotesToolbarProps) {
  // Local state for debounced search
  const [searchValue, setSearchValue] = useState(filters.destination || "");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.destination) {
        onFilterChange({ destination: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filters.destination, onFilterChange]);

  // Sync search value when filters change externally (e.g., browser back button)
  useEffect(() => {
    setSearchValue(filters.destination || "");
  }, [filters.destination]);

  /**
   * Handle date selection from calendar
   */
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const isoDate = date.toISOString().split("T")[0]; // YYYY-MM-DD format
      onFilterChange({ startFrom: isoDate });
    }
    setDatePickerOpen(false);
  };

  /**
   * Clear date filter
   */
  const handleClearDate = () => {
    onFilterChange({ startFrom: undefined });
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (value: string) => {
    onFilterChange({ sort: value as TripNotesListQuery["sort"] });
  };

  /**
   * Handle hasItinerary toggle
   */
  const handleItineraryToggle = (checked: boolean) => {
    onFilterChange({ hasItinerary: checked ? true : undefined });
  };

  return (
    <div className="mb-6 rounded-lg border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search-destination">Search Destination</Label>
          <Input
            id="search-destination"
            type="text"
            placeholder="e.g., Tokyo, Paris..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <Label>Start From</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startFrom ? (
                  <span>{formatDisplayDate(filters.startFrom)}</span>
                ) : (
                  <span className="text-muted-foreground">Pick a date</span>
                )}
                {filters.startFrom && (
                  <X
                    className="ml-auto h-4 w-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearDate();
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startFrom ? new Date(filters.startFrom) : undefined}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Sort Select */}
        <div className="space-y-2">
          <Label htmlFor="sort-select">Sort By</Label>
          <Select value={filters.sort || "-created_at"} onValueChange={handleSortChange}>
            <SelectTrigger id="sort-select">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Has Itinerary Filter */}
        <div className="space-y-2">
          <Label htmlFor="has-itinerary-toggle">Filter by Itinerary</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="has-itinerary-toggle"
              checked={filters.hasItinerary === true}
              onCheckedChange={handleItineraryToggle}
            />
            <Label htmlFor="has-itinerary-toggle" className="font-normal">
              Has Itinerary Only
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

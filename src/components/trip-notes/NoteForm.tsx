import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTripNoteSchema } from "@/lib/schemas/tripNote.schema";
import type { CreateTripNoteCommand } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse } from "date-fns";

export interface NoteFormProps {
  initialValues?: CreateTripNoteCommand;
  onSubmit: (values: CreateTripNoteCommand) => Promise<void>;
  disabled?: boolean;
  children?: (props: { handleSubmit: () => void; isValid: boolean }) => React.ReactNode; // Render prop for action buttons
  onDirtyChange?: (isDirty: boolean) => void; // Callback when form dirty state changes
}

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "PLN", label: "PLN - Polish Zloty" },
];

export function NoteForm({ initialValues, onSubmit, disabled = false, children, onDirtyChange }: NoteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setValue,
    watch,
  } = useForm<CreateTripNoteCommand>({
    resolver: zodResolver(CreateTripNoteSchema),
    mode: "onChange", // Validate on change to update isValid
    defaultValues: initialValues || {
      destination: "",
      earliestStartDate: "",
      latestStartDate: "",
      groupSize: 1,
      approximateTripLength: 7,
      budgetAmount: null,
      currency: null,
      details: null,
    },
  });

  // Notify parent of dirty state changes
  React.useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Create a submit handler that can be called from outside the form
  const triggerSubmit = React.useCallback(() => {
    handleSubmit(async (data: CreateTripNoteCommand) => {
      await onSubmit(data);
    })();
  }, [handleSubmit, onSubmit]);

  // Watch for flexible dates toggle
  const earliestStartDate = watch("earliestStartDate");
  const latestStartDate = watch("latestStartDate");
  const currency = watch("currency");

  const [flexibleDates, setFlexibleDates] = React.useState(
    initialValues ? initialValues.earliestStartDate !== initialValues.latestStartDate : false
  );

  // Parse date strings to Date objects
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      return parse(dateStr, "yyyy-MM-dd", new Date());
    } catch {
      return undefined;
    }
  };

  // Handle flexible dates toggle
  const handleFlexibleDatesChange = (checked: boolean) => {
    setFlexibleDates(checked);
    if (!checked && earliestStartDate) {
      // Mirror earliest date to latest date when disabling flexible dates
      setValue("latestStartDate", earliestStartDate, { shouldValidate: true });
    } else if (checked && earliestStartDate) {
      // Pre-populate latest date with earliest date when enabling flexible dates
      // Only if latest date is not set or is less than earliest date
      if (!latestStartDate || latestStartDate < earliestStartDate) {
        setValue("latestStartDate", earliestStartDate, { shouldValidate: true });
      }
    }
  };

  // Auto-populate Latest Start Date when Earliest Start Date changes and flexible dates is enabled
  React.useEffect(() => {
    if (flexibleDates && earliestStartDate) {
      // Only pre-populate if latest date is not set or is less than earliest date
      if (!latestStartDate || latestStartDate < earliestStartDate) {
        setValue("latestStartDate", earliestStartDate, { shouldValidate: true });
      }
    }
  }, [earliestStartDate, flexibleDates, latestStartDate, setValue]);

  return (
    <form
      onSubmit={handleSubmit(async (data: CreateTripNoteCommand) => {
        await onSubmit(data);
      })}
      className="space-y-6 p-6"
    >
      <div className="space-y-4">
        {/* Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination">
            Destination <span className="text-destructive">*</span>
          </Label>
          <Input
            id="destination"
            {...register("destination")}
            placeholder="e.g., Paris, France"
            disabled={disabled}
            aria-invalid={errors.destination ? "true" : "false"}
            aria-describedby={errors.destination ? "destination-error" : undefined}
          />
          {errors.destination && (
            <p id="destination-error" className="text-sm text-destructive">
              {errors.destination.message}
            </p>
          )}
        </div>

        {/* Flexible Dates Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="flexible-dates"
            checked={flexibleDates}
            onCheckedChange={handleFlexibleDatesChange}
            disabled={disabled}
          />
          <Label htmlFor="flexible-dates" className="font-normal cursor-pointer">
            Flexible travel dates
          </Label>
        </div>

        {/* Date Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="earliest-start-date">
              {flexibleDates ? "Earliest Start Date" : "Start Date"} <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              date={parseDate(earliestStartDate)}
              onDateChange={(date) => {
                const formatted = date ? format(date, "yyyy-MM-dd") : "";
                setValue("earliestStartDate", formatted, { shouldValidate: true });
                if (!flexibleDates && formatted) {
                  setValue("latestStartDate", formatted, { shouldValidate: true });
                }
              }}
              placeholder="Select start date"
              disabled={disabled}
              fromDate={new Date()}
            />
            {errors.earliestStartDate && <p className="text-sm text-destructive">{errors.earliestStartDate.message}</p>}
          </div>

          {flexibleDates && (
            <div className="space-y-2">
              <Label htmlFor="latest-start-date">
                Latest Start Date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                date={parseDate(latestStartDate)}
                onDateChange={(date) => {
                  const formatted = date ? format(date, "yyyy-MM-dd") : "";
                  setValue("latestStartDate", formatted, { shouldValidate: true });
                }}
                placeholder="Select latest date"
                disabled={disabled}
                fromDate={parseDate(earliestStartDate) || new Date()}
              />
              {errors.latestStartDate && <p className="text-sm text-destructive">{errors.latestStartDate.message}</p>}
            </div>
          )}
        </div>

        {/* Group Size and Trip Length */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="group-size">
              Group Size <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-size"
              type="number"
              min="1"
              max="99"
              {...register("groupSize", { valueAsNumber: true })}
              disabled={disabled}
              aria-invalid={errors.groupSize ? "true" : "false"}
              aria-describedby={errors.groupSize ? "group-size-error" : undefined}
            />
            {errors.groupSize && (
              <p id="group-size-error" className="text-sm text-destructive">
                {errors.groupSize.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="approximate-trip-length">
              Trip Length (days) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="approximate-trip-length"
              type="number"
              min="1"
              max="90"
              {...register("approximateTripLength", { valueAsNumber: true })}
              disabled={disabled}
              aria-invalid={errors.approximateTripLength ? "true" : "false"}
              aria-describedby={errors.approximateTripLength ? "trip-length-error" : undefined}
            />
            {errors.approximateTripLength && (
              <p id="trip-length-error" className="text-sm text-destructive">
                {errors.approximateTripLength.message}
              </p>
            )}
          </div>
        </div>

        {/* Budget Amount and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Budget Amount (optional)</Label>
            <Input
              id="budget-amount"
              type="number"
              min="0"
              placeholder="0"
              {...register("budgetAmount", {
                setValueAs: (v) => (v === "" || v === null ? null : parseInt(v)),
              })}
              disabled={disabled}
              aria-invalid={errors.budgetAmount ? "true" : "false"}
              aria-describedby={errors.budgetAmount ? "budget-error" : undefined}
            />
            {errors.budgetAmount && (
              <p id="budget-error" className="text-sm text-destructive">
                {errors.budgetAmount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency (optional)</Label>
            <Select
              value={currency || ""}
              onValueChange={(value) => setValue("currency", value || null, { shouldValidate: true })}
              disabled={disabled}
            >
              <SelectTrigger id="currency" aria-label="Select currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <Label htmlFor="details">Additional Details (optional)</Label>
          <Textarea
            id="details"
            {...register("details", {
              setValueAs: (v) => (v === "" ? null : v),
            })}
            placeholder="Add any specific preferences, interests, or requirements..."
            rows={6}
            disabled={disabled}
            className="resize-none"
            aria-describedby={errors.details ? "details-error" : undefined}
          />
          {errors.details && (
            <p id="details-error" className="text-sm text-destructive">
              {errors.details.message}
            </p>
          )}
        </div>
      </div>

      {/* Render children with form controls */}
      {children && <div className="pt-4 border-t">{children({ handleSubmit: triggerSubmit, isValid })}</div>}
    </form>
  );
}

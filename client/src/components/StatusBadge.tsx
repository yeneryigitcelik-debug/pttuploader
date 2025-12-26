import { cn } from "@/lib/utils";

type StatusType = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "NEEDS_MANUAL_ACTION" | "NEW" | "PROCESSED" | "ERROR";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    QUEUED: "bg-slate-100 text-slate-700 border-slate-200",
    NEW: "bg-blue-50 text-blue-700 border-blue-200",
    RUNNING: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
    SUCCESS: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PROCESSED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    FAILED: "bg-red-100 text-red-700 border-red-200",
    ERROR: "bg-red-100 text-red-700 border-red-200",
    NEEDS_MANUAL_ACTION: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const labels = {
    QUEUED: "Queued",
    NEW: "New",
    RUNNING: "Running",
    SUCCESS: "Success",
    PROCESSED: "Processed",
    FAILED: "Failed",
    ERROR: "Error",
    NEEDS_MANUAL_ACTION: "Manual Action",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm",
        styles[status] || "bg-gray-100 text-gray-800 border-gray-200",
        className
      )}
    >
      {labels[status] || status}
    </span>
  );
}

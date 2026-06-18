import { cn } from "@/lib/utils";

interface TurfFieldProps {
  className?: string;
  variant?: "full" | "compact";
}

/**
 * Green field soccer/football mockup with grid + center circle + goal boxes.
 * Used as a fallback for missing/broken turf images.
 */
export function TurfField({ className, variant = "full" }: TurfFieldProps) {
  return (
    <div
      className={cn(
        "relative w-full h-full bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 overflow-hidden",
        className,
      )}
      role="img"
      aria-label="Football turf"
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Center circle */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40",
          variant === "full"
            ? "w-40 h-40 sm:w-56 sm:h-56"
            : "w-20 h-20",
        )}
      />

      {/* Halfway line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />

      {/* Center spot */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60",
          variant === "full" ? "w-2 h-2" : "w-1.5 h-1.5",
        )}
      />

      {/* Goal box (bottom) */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 border-2 border-t-0 border-white/40",
          variant === "full"
            ? "w-1/3 h-16 sm:h-20"
            : "w-1/3 h-8",
        )}
      />
      {/* Goal (bottom) */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 bg-white/50",
          variant === "full"
            ? "w-16 sm:w-20 h-3 sm:h-4"
            : "w-8 h-2",
        )}
      />

      {/* Goal box (top) */}
      <div
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 border-2 border-b-0 border-white/40",
          variant === "full"
            ? "w-1/3 h-16 sm:h-20"
            : "w-1/3 h-8",
        )}
      />
    </div>
  );
}

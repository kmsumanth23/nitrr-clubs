import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Frosted-glass pill surface used by the navbar (and reusable elsewhere).
 * The blur/saturate + translucent white is the signature nav aesthetic.
 */
export function Pill({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-full border border-white/70 bg-white/55 shadow-soft backdrop-blur-md backdrop-saturate-150",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

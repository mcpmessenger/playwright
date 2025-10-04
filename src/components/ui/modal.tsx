"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, children, className }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm",
        className
      )}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-[min(96vw,1000px)] overflow-auto rounded-md bg-background p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}




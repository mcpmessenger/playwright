import * as React from "react";

export function CircleSticker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#ef4444" strokeWidth="8" />
    </svg>
  );
}

export function ArrowSticker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
        </marker>
      </defs>
      <path d="M5,70 C30,30 70,30 110,10" stroke="#f59e0b" strokeWidth="8" fill="none" markerEnd="url(#arrow)" />
    </svg>
  );
}

export function ClickHereSticker({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 60" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="176" height="56" rx="12" fill="#10b981" stroke="#064e3b" strokeWidth="4" />
      <text x="90" y="38" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="26" fill="#ffffff" fontWeight="700">
        Click Here
      </text>
    </svg>
  );
}




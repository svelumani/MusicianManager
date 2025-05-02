import React from "react";
import { LucideProps } from "lucide-react";

// Custom FileContract icon component that mimics the Lucide React style
export function FileContract(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 13a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-4z" />
      <path d="M10 13V9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4" />
      <path d="M8 17h8" />
      <path d="M8 20h8" />
    </svg>
  );
}

export default FileContract;
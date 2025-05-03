import React from "react";

interface FileContractProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function FileContract({ className, ...props }: FileContractProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M12 17v-6" />
      <path d="M10 14h4" />
      <path d="M10 11h1" />
      <path d="M14 11h1" />
    </svg>
  );
}
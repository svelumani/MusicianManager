import React from "react";
import { LucideProps } from "lucide-react";

export const FileContract = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, className, ...props }, ref) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        ref={ref}
        {...props}
      >
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M9 9h1" />
        <path d="M9 13h6" />
        <path d="M13 17h2" />
        <path d="M9 17h2" />
      </svg>
    );
  }
);

FileContract.displayName = "FileContract";

export default FileContract;
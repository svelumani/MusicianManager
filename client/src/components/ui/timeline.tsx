import * as React from "react";
import { cn } from "@/lib/utils";

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "left" | "right" | "alternate";
  children?: React.ReactNode;
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, position = "left", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative", className)}
        data-position={position}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Timeline.displayName = "Timeline";

interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex mb-6 last:mb-0", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";

interface TimelineSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const TimelineSeparator = React.forwardRef<HTMLDivElement, TimelineSeparatorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center mx-3", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineSeparator.displayName = "TimelineSeparator";

interface TimelineDotProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "filled" | "outlined";
  color?: "primary" | "secondary" | "success" | "error" | "info" | "warning";
}

const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, variant = "filled", color = "primary", ...props }, ref) => {
    const colorVariants = {
      primary: "bg-primary",
      secondary: "bg-secondary",
      success: "bg-green-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      warning: "bg-yellow-500",
    };
    
    const variantClasses = variant === "outlined" 
      ? "border-2 border-current bg-background" 
      : colorVariants[color];
    
    return (
      <div
        ref={ref}
        className={cn(
          "h-3 w-3 rounded-full",
          variantClasses,
          className
        )}
        {...props}
      />
    );
  }
);
TimelineDot.displayName = "TimelineDot";

interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {}

const TimelineConnector = React.forwardRef<HTMLDivElement, TimelineConnectorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-grow w-0.5 bg-border my-1", className)}
        {...props}
      />
    );
  }
);
TimelineConnector.displayName = "TimelineConnector";

interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineContent.displayName = "TimelineContent";

interface TimelineOppositeContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const TimelineOppositeContent = React.forwardRef<HTMLDivElement, TimelineOppositeContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1 text-right mr-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineOppositeContent.displayName = "TimelineOppositeContent";

export {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent
};
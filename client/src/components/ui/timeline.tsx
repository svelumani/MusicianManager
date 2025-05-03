import * as React from "react";
import { cn } from "@/lib/utils";

type TimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  position?: "left" | "right" | "alternate";
  children: React.ReactNode;
};

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, position = "right", children, ...props }, ref) => {
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

type TimelineItemProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex my-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";

type TimelineSeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const TimelineSeparator = React.forwardRef<HTMLDivElement, TimelineSeparatorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineSeparator.displayName = "TimelineSeparator";

type TimelineDotProps = React.HTMLAttributes<HTMLDivElement> & {
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info";
  variant?: "filled" | "outlined";
  size?: "small" | "medium" | "large";
};

const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, color = "primary", variant = "filled", size = "medium", ...props }, ref) => {
    const sizesMap = {
      small: "h-2 w-2",
      medium: "h-3 w-3",
      large: "h-4 w-4"
    };
    
    const colorsMap = {
      default: "bg-gray-500 border-gray-500",
      primary: "bg-primary border-primary",
      secondary: "bg-secondary border-secondary",
      success: "bg-green-500 border-green-500",
      warning: "bg-yellow-500 border-yellow-500",
      error: "bg-red-500 border-red-500",
      info: "bg-blue-500 border-blue-500"
    };
    
    const bgClass = variant === "filled" ? colorsMap[color].split(" ")[0] : "bg-white";
    const borderClass = `border-2 ${colorsMap[color].split(" ")[1]}`;
    
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full", 
          sizesMap[size], 
          bgClass, 
          borderClass, 
          className
        )}
        {...props}
      />
    );
  }
);
TimelineDot.displayName = "TimelineDot";

type TimelineConnectorProps = React.HTMLAttributes<HTMLDivElement>;

const TimelineConnector = React.forwardRef<HTMLDivElement, TimelineConnectorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1 w-0.5 bg-muted my-1", className)}
        {...props}
      />
    );
  }
);
TimelineConnector.displayName = "TimelineConnector";

type TimelineContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1 px-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineContent.displayName = "TimelineContent";

type TimelineOppositeContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const TimelineOppositeContent = React.forwardRef<HTMLDivElement, TimelineOppositeContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1 text-right pr-4", className)}
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
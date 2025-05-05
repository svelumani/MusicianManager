import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export interface ButtonGroupItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn("flex overflow-hidden rounded-md", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

const ButtonGroupItem = React.forwardRef<HTMLButtonElement, ButtonGroupItemProps>(
  ({ className, children, onClick, disabled, active, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex-1 px-3 py-2 text-sm font-medium transition-colors",
          "first:rounded-l-md last:rounded-r-md",
          "border border-input hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          "border-r-0 last:border-r border-l-0 first:border-l",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ButtonGroupItem.displayName = "ButtonGroupItem"

export { ButtonGroup, ButtonGroupItem }
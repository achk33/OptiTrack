import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const cardVariants = cva(
  "rounded-2xl border bg-white transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-slate-200 shadow-soft hover:shadow-medium",
        elevated: "border-slate-200 shadow-medium hover:shadow-strong",
        glass: "border-white/20 bg-white/10 backdrop-blur-sm shadow-soft",
        gradient: "border-transparent bg-gradient-to-br from-brand-50 to-brand-100 shadow-soft hover:shadow-medium hover:shadow-glow",
        success: "border-success-200 bg-success-50/50 shadow-soft hover:shadow-glow-success",
        warning: "border-warning-200 bg-warning-50/50 shadow-soft hover:shadow-glow-warning",
        danger: "border-danger-200 bg-danger-50/50 shadow-soft hover:shadow-glow-danger"
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:scale-[1.02]",
        glow: "hover:shadow-glow",
        scale: "hover:scale-[1.02]"
      }
    },
    defaultVariants: {
      variant: "default",
      hover: "none"
    }
  }
)

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, hover }), className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-2 p-6", className)} {...props} />
  )
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-xl font-bold leading-none tracking-tight text-slate-900", className)} {...props} />
  )}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-500 leading-relaxed", className)} {...props} />
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props} />
  )
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
}

// Specialized Card Components
export function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendValue, 
  variant = "default",
  className, 
  ...props 
}: {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "stable"
  trendValue?: string
  variant?: VariantProps<typeof cardVariants>["variant"]
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const trendColors = {
    up: "text-success-600",
    down: "text-danger-600",
    stable: "text-slate-500"
  }

  const trendIcons = {
    up: "↗",
    down: "↘",
    stable: "→"
  }

  return (
    <Card variant={variant} hover="lift" className={cn("group", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-3xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</p>
              {trend && trendValue && (
                <span className={cn("text-sm font-semibold flex items-center gap-1", trendColors[trend])}>
                  <span className="text-base">{trendIcons[trend]}</span>
                  {trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 bg-brand-100/50 rounded-xl flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition-colors">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

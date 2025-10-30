import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-slate-100",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4"
      },
      variant: {
        default: "bg-slate-100",
        success: "bg-success-100",
        warning: "bg-warning-100",
        danger: "bg-danger-100"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
)

const progressBarVariants = cva(
  "h-full w-full flex-1 transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-brand-500 to-brand-600",
        success: "bg-gradient-to-r from-success-500 to-success-600",
        warning: "bg-gradient-to-r from-warning-500 to-warning-600",
        danger: "bg-gradient-to-r from-danger-500 to-danger-600"
      },
      animated: {
        true: "relative overflow-hidden",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      animated: false
    }
  }
)

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number
  max?: number
  animated?: boolean
  showValue?: boolean
  label?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    size, 
    variant, 
    animated = false,
    showValue = false,
    label,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const getVariantFromValue = (val: number): VariantProps<typeof progressBarVariants>['variant'] => {
      if (val >= 80) return 'success'
      if (val >= 60) return 'default'
      if (val >= 40) return 'warning'
      return 'danger'
    }

    const barVariant = variant === 'default' ? getVariantFromValue(percentage) : variant

    return (
      <div className="space-y-2">
        {(label || showValue) && (
          <div className="flex items-center justify-between text-sm">
            {label && <span className="font-medium text-slate-700">{label}</span>}
            {showValue && (
              <span className="text-slate-600 font-medium">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div
          ref={ref}
          className={cn(progressVariants({ size, variant }), className)}
          {...props}
        >
          <div
            className={cn(progressBarVariants({ variant: barVariant, animated }))}
            style={{ width: `${percentage}%` }}
          >
            {animated && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            )}
          </div>
        </div>
      </div>
    )
  }
)

Progress.displayName = "Progress"

// Circular Progress Component
export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showValue?: boolean
  label?: string
}

export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({
    className,
    value = 0,
    max = 100,
    size = 120,
    strokeWidth = 8,
    variant = 'default',
    showValue = true,
    label,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference.toFixed(3)
    const strokeDashoffset = (circumference - (percentage / 100) * circumference).toFixed(3)

    const getColor = (variant: string, percentage: number) => {
      if (variant !== 'default') {
        switch (variant) {
          case 'success': return 'stroke-success-500'
          case 'warning': return 'stroke-warning-500'
          case 'danger': return 'stroke-danger-500'
          default: return 'stroke-brand-500'
        }
      }
      
      if (percentage >= 80) return 'stroke-success-500'
      if (percentage >= 60) return 'stroke-brand-500'
      if (percentage >= 40) return 'stroke-warning-500'
      return 'stroke-danger-500'
    }

    const getTextColor = (variant: string, percentage: number) => {
      if (variant !== 'default') {
        switch (variant) {
          case 'success': return 'text-success-600'
          case 'warning': return 'text-warning-600'
          case 'danger': return 'text-danger-600'
          default: return 'text-brand-600'
        }
      }
      
      if (percentage >= 80) return 'text-success-600'
      if (percentage >= 60) return 'text-brand-600'
      if (percentage >= 40) return 'text-warning-600'
      return 'text-danger-600'
    }

    return (
      <div ref={ref} className={cn("flex flex-col items-center space-y-2", className)} {...props}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            className="transform -rotate-90"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="none"
              className="text-slate-200"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn(
                "transition-all duration-300 ease-in-out",
                getColor(variant, percentage)
              )}
            />
          </svg>
          
          {/* Center content */}
          {showValue && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn(
                  "text-2xl font-bold",
                  getTextColor(variant, percentage)
                )}>
                  {Math.round(percentage)}%
                </div>
              </div>
            </div>
          )}
        </div>
        
        {label && (
          <p className="text-sm font-medium text-slate-700 text-center">{label}</p>
        )}
      </div>
    )
  }
)

CircularProgress.displayName = "CircularProgress"

export { Progress, progressVariants }
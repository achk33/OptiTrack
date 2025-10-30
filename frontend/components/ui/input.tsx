import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Search, Eye, EyeOff } from "lucide-react"

const inputVariants = cva(
  "flex w-full rounded-xl border bg-white px-4 py-3 text-sm transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-200 focus-visible:ring-brand-500 focus-visible:border-brand-500 hover:border-slate-300",
        success: "border-success-200 focus-visible:ring-success-500 focus-visible:border-success-500",
        warning: "border-warning-200 focus-visible:ring-warning-500 focus-visible:border-warning-500",
        danger: "border-danger-200 focus-visible:ring-danger-500 focus-visible:border-danger-500"
      },
      size: {
        sm: "h-9 px-3 py-2 text-xs",
        default: "h-11 px-4 py-3 text-sm",
        lg: "h-12 px-5 py-3 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string
  description?: string
  error?: string
  success?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rightElement?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type = "text",
    label, 
    description, 
    error, 
    success, 
    leftIcon, 
    rightIcon, 
    rightElement,
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputId = id || React.useId()
    
    // Determine variant based on state
    const resolvedVariant = error ? "danger" : success ? "success" : variant

    const isPassword = type === "password"
    const inputType = isPassword && showPassword ? "text" : type

    return (
      <div className="w-full space-y-2">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-sm font-semibold text-slate-700 flex items-center gap-2"
          >
            {label}
            {props.required && <span className="text-danger-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants({ variant: resolvedVariant, size }),
              leftIcon && "pl-10",
              (rightIcon || rightElement || isPassword) && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          
          {!isPassword && (rightIcon || rightElement) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightElement || rightIcon}
            </div>
          )}
        </div>
        
        {description && !error && !success && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
        
        {success && (
          <p className="text-xs text-success-600 font-medium">{success}</p>
        )}
        
        {error && (
          <p className="text-xs text-danger-600 font-medium">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Search Input Component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  loading?: boolean
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, loading, className, ...props }, ref) => {
    const [value, setValue] = React.useState(props.value || "")
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)
      props.onChange?.(e)
      
      // Debounced search
      const timeoutId = setTimeout(() => {
        onSearch?.(newValue)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
    
    const handleClear = () => {
      setValue("")
      onClear?.()
    }
    
    return (
      <Input
        ref={ref}
        type="text"
        leftIcon={<Search className="h-4 w-4" />}
        rightElement={
          value && !loading ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          ) : loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-brand-600 rounded-full" />
          ) : null
        }
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, inputVariants }
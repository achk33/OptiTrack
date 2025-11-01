import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { CheckCircle2, AlertTriangle, XCircle, Clock, Shield, Wrench, Eye } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
        success: "border-success-200 bg-success-50 text-success-700 hover:bg-success-100 shadow-glow-success",
        warning: "border-warning-200 bg-warning-50 text-warning-700 hover:bg-warning-100 shadow-glow-warning",
        danger: "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100 shadow-glow-danger",
        brand: "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 shadow-glow",
        outline: "border-current text-slate-600 hover:bg-slate-50",
        glass: "bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
      },
      size: {
        sm: "text-2xs px-2 py-0.5",
        default: "text-xs px-3 py-1",
        lg: "text-sm px-4 py-1.5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  )
}

// Professional Status Badges
interface StatusBadgeProps {
  status: "OK" | "A_verifier" | "Non_conforme" | "En_attente"
  size?: VariantProps<typeof badgeVariants>["size"]
  className?: string
}

export function StatusBadge({ status, size, className }: StatusBadgeProps) {
  const configs = {
    OK: {
      variant: "success" as const,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Confirme"
    },
    A_verifier: {
      variant: "warning" as const,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "À vérifier"
    },
    Non_conforme: {
      variant: "danger" as const,
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Non confirme"
    },
    En_attente: {
      variant: "default" as const,
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "En attente"
    }
  }

  const config = configs[status]

  return (
    <Badge variant={config.variant} size={size} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  )
}

// Role Badges
interface RoleBadgeProps {
  role?: "Admin" | "Technicien" | "Lecteur" | string | null
  size?: VariantProps<typeof badgeVariants>["size"]
  className?: string
}

export function RoleBadge({ role, size, className }: RoleBadgeProps) {
  const configs = {
    Admin: {
      variant: "brand" as const,
      icon: <Shield className="h-3.5 w-3.5" />
    },
    Technicien: {
      variant: "success" as const,
      icon: <Wrench className="h-3.5 w-3.5" />
    },
    Lecteur: {
      variant: "default" as const,
      icon: <Eye className="h-3.5 w-3.5" />
    }
  }

  // Handle undefined, null, or unknown roles
  if (!role) {
    return (
      <Badge variant="outline" size={size} className={className}>
        Non défini
      </Badge>
    )
  }

  // Get config for the role, or use default Lecteur config
  const config = configs[role as keyof typeof configs] || configs.Lecteur

  return (
    <Badge variant={config.variant} size={size} icon={config.icon} className={className}>
      {role}
    </Badge>
  )
}

// Priority Badge
interface PriorityBadgeProps {
  priority: "High" | "Medium" | "Low"
  size?: VariantProps<typeof badgeVariants>["size"]
  className?: string
}

export function PriorityBadge({ priority, size, className }: PriorityBadgeProps) {
  const configs = {
    High: {
      variant: "danger" as const,
      label: "Haute"
    },
    Medium: {
      variant: "warning" as const,
      label: "Moyenne"
    },
    Low: {
      variant: "success" as const,
      label: "Basse"
    }
  }

  const config = configs[priority]

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  )
}

export { Badge, badgeVariants }
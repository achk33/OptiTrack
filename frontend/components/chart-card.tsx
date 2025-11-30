"use client"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import type { ReactNode } from "react"

export function ChartCard({ title, description, children, actions, heightClass = 'h-[300px]' }: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  heightClass?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          {actions}
        </CardHeader>
        <CardContent>
          <div className={`${heightClass} w-full min-h-[200px] min-w-[200px]`}>
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

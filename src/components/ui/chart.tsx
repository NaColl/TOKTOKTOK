import { TooltipProps } from "recharts/types/component/Tooltip"
import React from 'react'

export interface ChartConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

export function ChartContainer({
  children,
  config,
  className,
}: {
  children: React.ReactNode
  config: ChartConfig
  className?: string
}) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CustomTooltipProps {
  children?: React.ReactNode
  className?: string
}

export function ChartTooltip({ children, className }: CustomTooltipProps) {
  return (
    <div className={`rounded-lg border bg-white p-2 shadow-sm ${className || ''}`}>
      {children}
    </div>
  )
}
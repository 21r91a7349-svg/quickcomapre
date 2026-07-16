import * as React from "react"

export function BrandLogo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Magnifying glass merging into a clock - signifying "Quick Search" */}
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 7 7" />
      <path d="M10 7v3l2.5 2.5" />
    </svg>
  )
}

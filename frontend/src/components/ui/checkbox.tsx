import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  CheckIconSize = "size-3.5",
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  CheckIconSize?: string
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "hover:cursor-pointer size-4 shrink-0 rounded-md border border-slate-300 bg-white text-slate-50 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-200 data-[state=checked]:border-slate-100 data-[state=checked]:bg-blue-400 aria-invalid:border-rose-400 aria-invalid:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className={CheckIconSize} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

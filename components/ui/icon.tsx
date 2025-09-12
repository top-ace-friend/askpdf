import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconVariants = cva("inline-flex items-center justify-center", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      default: "h-5 w-5",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-10 w-10",
      "2xl": "h-12 w-12",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface IconProps
  extends React.SVGAttributes<SVGElement>,
    Omit<VariantProps<typeof iconVariants>, "size"> {
  children?: React.ReactNode;
  viewBox?: string;
  size?: number | string | VariantProps<typeof iconVariants>["size"];
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    { className, size, children, viewBox = "0 0 24 24", style, ...props },
    ref
  ) => {
    // Handle flexible sizing
    const isCustomSize =
      typeof size === "number" ||
      (typeof size === "string" &&
        !["xs", "sm", "default", "md", "lg", "xl", "2xl"].includes(size));

    const customStyle = isCustomSize
      ? {
          width: typeof size === "number" ? `${size}px` : size,
          height: typeof size === "number" ? `${size}px` : size,
          ...style,
        }
      : style;

    const variantSize = isCustomSize
      ? undefined
      : (size as VariantProps<typeof iconVariants>["size"]);

    return (
      <svg
        ref={ref}
        viewBox={viewBox}
        fill="currentColor"
        className={cn(
          iconVariants({ size: variantSize }),
          isCustomSize && "inline-flex items-center justify-center",
          className
        )}
        style={customStyle}
        {...props}
      >
        {children}
      </svg>
    );
  }
);

Icon.displayName = "Icon";

export { Icon, iconVariants };

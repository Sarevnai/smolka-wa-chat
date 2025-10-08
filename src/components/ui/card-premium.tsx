import * as React from "react";
import { cn } from "@/lib/utils";

const CardPremium = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border-2 border-gold-primary/30 bg-surface-elevated shadow-gold-md",
      "hover:shadow-gold-lg transition-all duration-300",
      className
    )}
    {...props}
  />
));
CardPremium.displayName = "CardPremium";

const CardPremiumHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 bg-gradient-to-br from-gold-light to-transparent",
      className
    )}
    {...props}
  />
));
CardPremiumHeader.displayName = "CardPremiumHeader";

const CardPremiumTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-bold leading-none tracking-tight text-neutral-900",
      className
    )}
    {...props}
  />
));
CardPremiumTitle.displayName = "CardPremiumTitle";

const CardPremiumDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-600", className)}
    {...props}
  />
));
CardPremiumDescription.displayName = "CardPremiumDescription";

const CardPremiumContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardPremiumContent.displayName = "CardPremiumContent";

const CardPremiumFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardPremiumFooter.displayName = "CardPremiumFooter";

export {
  CardPremium,
  CardPremiumHeader,
  CardPremiumFooter,
  CardPremiumTitle,
  CardPremiumDescription,
  CardPremiumContent,
};

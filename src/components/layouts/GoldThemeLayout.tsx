import { ReactNode } from "react";

interface GoldThemeLayoutProps {
  children: ReactNode;
}

export function GoldThemeLayout({ children }: GoldThemeLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-primary text-neutral-900">
      {children}
    </div>
  );
}

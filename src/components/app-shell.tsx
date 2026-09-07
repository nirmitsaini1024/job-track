"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="size-4" />
              Job Tracker
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? currentPath === "/"
                    : currentPath.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "rounded-md bg-muted px-2.5 py-1 text-sm font-medium"
                        : "rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/applications/new"
              className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80"
            >
              Add application
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { AnalyseNavButton } from "@/components/analyse-nav-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/questionnaire", label: "Questionnaire" },
  { href: "/profile", label: "Profile" },
];

const SHELL_WIDTH = "mx-auto w-full max-w-[96rem] min-w-0 px-4";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname();
  const isAuthPage = AUTH_PATHS.has(currentPath);
  const isOnboarding = currentPath === "/onboarding";

  if (isAuthPage) {
    return (
      <div className="min-h-full bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className={`${SHELL_WIDTH} flex h-12 items-center justify-between`}>
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <Briefcase className="size-4" />
              Job Tracker
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className={`${SHELL_WIDTH} py-8`}>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className={`${SHELL_WIDTH} flex h-12 items-center justify-between`}>
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <Briefcase className="size-4" />
              Job Tracker
            </Link>
            {!isOnboarding ? (
              <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
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
                          ? "shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-sm font-medium text-foreground"
                          : "shrink-0 rounded-md border border-transparent px-2.5 py-1 text-sm text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
                      }
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isOnboarding ? (
              <>
                <AnalyseNavButton />
                <Link
                  href="/applications/new"
                  className="inline-flex h-7 items-center rounded-md border border-primary bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Add application
                </Link>
              </>
            ) : null}
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`${SHELL_WIDTH} py-8`}>
        <div className="min-w-0 w-full">{children}</div>
      </main>
    </div>
  );
}

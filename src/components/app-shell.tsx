"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Menu } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { AnalyseNavButton } from "@/components/analyse-nav-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/questionnaire", label: "Questionnaire" },
  { href: "/profile", label: "Profile" },
];

const SHELL_WIDTH = "mx-auto w-full max-w-[96rem] min-w-0 px-4";

const AUTH_PATHS = new Set(["/login", "/signup"]);

function navLinkClass(active: boolean) {
  return active
    ? "shrink-0 rounded-md border border-border bg-muted px-2.5 py-1 text-sm font-medium text-foreground"
    : "shrink-0 rounded-md border border-transparent px-2.5 py-1 text-sm text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground";
}

function mobileNavLinkClass(active: boolean) {
  return active
    ? "rounded-md border border-border bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
    : "rounded-md border border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground";
}

function isActivePath(href: string, currentPath: string) {
  return href === "/"
    ? currentPath === "/"
    : currentPath.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname();
  const isAuthPage = AUTH_PATHS.has(currentPath);
  const isOnboarding = currentPath === "/onboarding";
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <div className={`${SHELL_WIDTH} flex h-12 items-center justify-between gap-3`}>
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <Briefcase className="size-4" />
              Job Tracker
            </Link>
            {!isOnboarding ? (
              <nav className="hidden min-w-0 items-center gap-0.5 md:flex">
                {NAV.map((item) => {
                  const active = isActivePath(item.href, currentPath);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={navLinkClass(active)}
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
              <div className="hidden items-center gap-2 md:flex">
                <AnalyseNavButton />
                <Link
                  href="/applications/new"
                  className="inline-flex h-7 items-center rounded-md border border-primary bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Add application
                </Link>
                <form action={logoutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    Log out
                  </Button>
                </form>
              </div>
            ) : (
              <form action={logoutAction} className="hidden md:block">
                <Button type="submit" variant="ghost" size="sm">
                  Log out
                </Button>
              </form>
            )}
            <ThemeToggle />
            {!isOnboarding ? (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="md:hidden"
                      aria-label="Open menu"
                    />
                  }
                >
                  <Menu className="size-4" />
                </SheetTrigger>
                <SheetContent side="right" className="gap-0 p-0">
                  <SheetHeader className="border-b">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-1 flex-col gap-6 p-4">
                    <nav className="flex flex-col gap-1">
                      {NAV.map((item) => {
                        const active = isActivePath(item.href, currentPath);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={mobileNavLinkClass(active)}
                            onClick={() => setMobileOpen(false)}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                    <div className="flex flex-col gap-2 border-t pt-4">
                      <div onClick={() => setMobileOpen(false)}>
                        <AnalyseNavButton />
                      </div>
                      <Link
                        href="/applications/new"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        onClick={() => setMobileOpen(false)}
                      >
                        Add application
                      </Link>
                      <form action={logoutAction}>
                        <Button
                          type="submit"
                          variant="outline"
                          className="w-full"
                        >
                          Log out
                        </Button>
                      </form>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <form action={logoutAction} className="md:hidden">
                <Button type="submit" variant="ghost" size="sm">
                  Log out
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main className={`${SHELL_WIDTH} py-8`}>
        <div className="min-w-0 w-full">{children}</div>
      </main>
    </div>
  );
}

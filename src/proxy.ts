import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decrypt } from "@/lib/jwt";

const publicRoutes = ["/login", "/signup"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);
  const isOnboardingRoute = path === "/onboarding";

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await decrypt(token);
  const isLoggedIn = Boolean(session?.userId);

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    const destination = session?.onboardingCompleted ? "/" : "/onboarding";
    return NextResponse.redirect(new URL(destination, req.nextUrl));
  }

  if (
    isLoggedIn &&
    !session?.onboardingCompleted &&
    !isOnboardingRoute &&
    !isPublicRoute
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
  }

  if (isLoggedIn && session?.onboardingCompleted && isOnboardingRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

import { NextRequest, NextResponse } from "next/server";

function deny() {
  return new NextResponse("Not Found", { status: 404 });
}

export function proxy(request: NextRequest) {
  const configuredUser = process.env.DASHBOARD_BASIC_USER;
  const configuredPassword = process.env.DASHBOARD_BASIC_PASSWORD;

  if (!configuredUser || !configuredPassword) {
    return process.env.NODE_ENV === "production" ? deny() : NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const [user, password] = atob(authorization.slice(6)).split(":", 2);
      if (user === configuredUser && password === configuredPassword) return NextResponse.next();
    } catch {}
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="NianNian Dashboard", charset="UTF-8"' }
  });
}

export const config = { matcher: ["/dashboard/:path*"] };

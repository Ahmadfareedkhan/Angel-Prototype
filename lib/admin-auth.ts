import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the admin password from the Authorization header.
 * Expects: `Authorization: Bearer <ADMIN_PASSWORD>`
 */
export function validateAdmin(request: NextRequest): NextResponse | null {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "Admin access is not configured" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== adminPassword) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}

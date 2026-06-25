import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await getSession();
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

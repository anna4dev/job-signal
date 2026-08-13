import { NextResponse } from "next/server";
import { getCanonicalJobStackStats } from "@/lib/jobTechStackCache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCanonicalJobStackStats();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Stack API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

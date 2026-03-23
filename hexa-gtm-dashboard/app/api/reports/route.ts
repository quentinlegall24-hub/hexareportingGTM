import { NextResponse } from "next/server";
import { fetchAllReports } from "@/lib/notion";

export const revalidate = 300; // revalidate every 5 minutes

export async function GET() {
  try {
    const reports = await fetchAllReports();
    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("Failed to fetch reports from Notion:", error);
    return NextResponse.json(
      { error: "Failed to fetch data", details: error.message },
      { status: 500 }
    );
  }
}

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export interface ReportRow {
  startup: string;
  week: string;
  leadsGenerated: number;
  qualificationsHeld: number;
  offersSent: number;
  newCustomers: number;
  newARR: number;
  customersLost: number;
  arrLost: number;
  totalCustomers: number;
  arrStart: number;
  arrEnd: number;
  projectedARR: number;
  type: "weekly" | "monthly";
  status: string;
}

function getNumber(page: any, prop: string): number {
  return page.properties[prop]?.number ?? 0;
}

function getSelect(page: any, prop: string): string {
  return page.properties[prop]?.select?.name ?? "";
}

function getTitle(page: any): string {
  const titleProp = page.properties["Startup"];
  if (!titleProp?.title?.length) return "";
  return titleProp.title[0].plain_text;
}

function getDate(page: any, prop: string): string {
  return page.properties[prop]?.date?.start ?? "";
}

export async function fetchAllReports(): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      sorts: [{ property: "Week", direction: "ascending" }],
    });

    for (const page of response.results) {
      rows.push({
        startup: getTitle(page),
        week: getDate(page, "Week"),
        leadsGenerated: getNumber(page, "Leads Generated"),
        qualificationsHeld: getNumber(page, "Qualifications Held"),
        offersSent: getNumber(page, "Offers Sent"),
        newCustomers: getNumber(page, "New Customers"),
        newARR: getNumber(page, "New ARR Added"),
        customersLost: getNumber(page, "Customers Lost"),
        arrLost: getNumber(page, "ARR Lost"),
        totalCustomers: getNumber(page, "Total Customers"),
        arrStart: getNumber(page, "ARR Start of Week"),
        arrEnd: getNumber(page, "ARR End of Week"),
        projectedARR: getNumber(page, "Projected ARR"),
        type: getSelect(page, "Report Type") as "weekly" | "monthly",
        status: getSelect(page, "Status"),
      });
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return rows;
}

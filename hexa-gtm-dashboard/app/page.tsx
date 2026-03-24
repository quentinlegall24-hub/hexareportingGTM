import { fetchAllReports } from "@/lib/data";
import Dashboard from "./dashboard";

export const revalidate = 300; // ISR: refresh every 5 min

export default async function Page() {
  let data: Awaited<ReturnType<typeof fetchAllReports>>;
  try {
    data = await fetchAllReports();
  } catch (e) {
    data = [];
  }
  return <Dashboard initialData={data} />;
}

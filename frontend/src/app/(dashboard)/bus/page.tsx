import { BusView } from "@/modules/bus/views/bus-view";
import { getServerBuses } from "@/lib/server-api";

export default async function BusPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const search =
    typeof params.search === "string" ? params.search : undefined;
  const status =
    params.status === "assigned" || params.status === "unassigned"
      ? (params.status as "assigned" | "unassigned")
      : undefined;
  const page =
    typeof params.page === "string" && params.page.trim() !== ""
      ? Number(params.page)
      : 1;

  // Initial server-rendered data (no filters for now; client will re-query with filters)
  const initialBuses = await getServerBuses();

  return (
    <BusView
      initialBuses={initialBuses}
      initialFilters={{
        search: search ?? "",
        status: status ?? "all",
        page: Number.isNaN(page) ? 1 : page,
      }}
    />
  );
}
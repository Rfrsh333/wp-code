import { redirect } from "next/navigation";

// Oude deeplinks (push, mail) wijzen naar /klant/uren?tab=…; de tab-keuze moet mee naar het dashboard.
export default async function KlantUren({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : null;
  redirect(tab ? `/klant/dashboard?tab=${encodeURIComponent(tab)}` : "/klant/dashboard");
}

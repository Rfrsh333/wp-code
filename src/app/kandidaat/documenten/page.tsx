import KandidaatDocumentenClient from "./KandidaatDocumentenClient";

export default async function KandidaatDocumentenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center text-neutral-600">
        Geen geldige uploadlink gevonden.
      </div>
    );
  }

  return <KandidaatDocumentenClient token={token} />;
}

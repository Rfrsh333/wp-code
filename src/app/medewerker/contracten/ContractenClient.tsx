'use client';

import { useEffect, useState } from 'react';

interface MedewerkerContract {
  id: string;
  contract_nummer: string;
  type: string;
  titel: string;
  status: string;
  startdatum: string | null;
  einddatum: string | null;
  verzonden_at: string | null;
  ondertekend_medewerker_at: string | null;
  ondertekend_admin_at: string | null;
  created_at: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  verzonden: { label: 'Ter ondertekening', color: 'bg-blue-100 text-blue-700' },
  bekeken: { label: 'Ter ondertekening', color: 'bg-blue-100 text-blue-700' },
  ondertekend_medewerker: { label: 'Wacht op werkgever', color: 'bg-yellow-100 text-yellow-700' },
  ondertekend_admin: { label: 'Wacht op jou', color: 'bg-orange-100 text-orange-700' },
  actief: { label: 'Actief', color: 'bg-green-100 text-green-700' },
  verlopen: { label: 'Verlopen', color: 'bg-red-100 text-red-700' },
  opgezegd: { label: 'Opgezegd', color: 'bg-neutral-100 text-neutral-500' },
};

const typeLabels: Record<string, string> = {
  arbeidsovereenkomst: 'Arbeidsovereenkomst',
  uitzendovereenkomst: 'Uitzendovereenkomst',
  oproepovereenkomst: 'Oproepovereenkomst',
  freelance: 'Freelance',
  overeenkomst_van_opdracht: 'Overeenkomst van Opdracht (ZZP)',
  stage: 'Stage',
  custom: 'Overig',
};

export default function ContractenClient() {
  const [contracten, setContracten] = useState<MedewerkerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContracten = async () => {
      try {
        const res = await fetch('/api/medewerker/contracten');
        const { data } = await res.json();
        setContracten(data || []);
      } catch {
        console.error('Contracten laden mislukt');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchContracten();
  }, []);

  const actieveContracten = contracten.filter((c) => c.status === 'actief');
  const openContracten = contracten.filter((c) =>
    ['verzonden', 'bekeken', 'ondertekend_medewerker', 'ondertekend_admin'].includes(c.status)
  );
  const overige = contracten.filter((c) => ['verlopen', 'opgezegd'].includes(c.status));

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#F27501] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Contracten laden...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Mijn Contracten</h1>

      {contracten.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
          <p className="text-gray-500">Je hebt nog geen contracten.</p>
        </div>
      ) : (
        <>
          {/* Open contracten (actie vereist) */}
          {openContracten.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">Actie vereist</h2>
              {openContracten.map((contract) => (
                <ContractCard key={contract.id} contract={contract} highlight />
              ))}
            </div>
          )}

          {/* Actieve contracten */}
          {actieveContracten.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">Actieve contracten</h2>
              {actieveContracten.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          )}

          {/* Overige */}
          {overige.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-800">Afgelopen</h2>
              {overige.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContractCard({
  contract,
  highlight = false,
}: {
  contract: MedewerkerContract;
  highlight?: boolean;
}) {
  const status = statusLabels[contract.status] || { label: contract.status, color: 'bg-gray-100 text-gray-600' };
  const needsAction = ['verzonden', 'bekeken', 'ondertekend_admin'].includes(contract.status);

  return (
    <div
      className={`bg-white rounded-2xl border p-5 ${
        highlight ? 'border-[#F27501]/30 shadow-sm' : 'border-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-neutral-900 truncate">{contract.titel}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 text-sm text-neutral-500">
            <span>{contract.contract_nummer}</span>
            <span>{typeLabels[contract.type] || contract.type}</span>
            {contract.startdatum && (
              <span>
                Start: {new Date(contract.startdatum + 'T00:00:00').toLocaleDateString('nl-NL')}
              </span>
            )}
          </div>
        </div>

        {needsAction && (
          <a
            href={`/api/contract/ondertekenen?redirect=true&contract_id=${contract.id}`}
            className="px-3 py-1.5 text-sm bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] whitespace-nowrap"
          >
            Ondertekenen
          </a>
        )}
      </div>
    </div>
  );
}

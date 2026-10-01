'use client';

import { useEffect, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import * as Sentry from "@sentry/nextjs";
import MedewerkerResponsiveLayout from '@/components/medewerker/MedewerkerResponsiveLayout';

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
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body.error || 'Contracten laden mislukt');
          return;
        }
        setContracten(body.data || []);
      } catch (err) {
        Sentry.captureException(err);
        toast.error('Contracten laden mislukt');
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

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
          <div className="px-4 py-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">Mijn contracten</h1>
            <p className="text-sm text-[var(--mp-text-secondary)] mt-1">Bekijk en onderteken je contracten</p>
          </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contracten.length === 0 ? (
            <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-8 text-center shadow-[var(--mp-shadow)]">
              <FileSignature className="w-12 h-12 text-[var(--mp-text-tertiary)] mx-auto mb-3" />
              <p className="text-sm text-[var(--mp-text-secondary)]">Je hebt nog geen contracten.</p>
            </div>
          ) : (
            <>
              {openContracten.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-[var(--mp-text-primary)]">Actie vereist</h2>
                  {openContracten.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} highlight />
                  ))}
                </section>
              )}

              {actieveContracten.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-[var(--mp-text-primary)]">Actieve contracten</h2>
                  {actieveContracten.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} />
                  ))}
                </section>
              )}

              {overige.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-[var(--mp-text-primary)]">Afgelopen</h2>
                  {overige.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </MedewerkerResponsiveLayout>
  );
}

function ContractCard({
  contract,
  highlight = false,
}: {
  contract: MedewerkerContract;
  highlight?: boolean;
}) {
  const [bezig, setBezig] = useState(false);
  const status = statusLabels[contract.status] || { label: contract.status, color: 'bg-gray-100 text-gray-600' };
  const needsAction = ['verzonden', 'bekeken', 'ondertekend_admin'].includes(contract.status);

  // Haalt via een ingelogde route de bestaande ondertekenlink (token) van dit eigen contract op.
  const openOndertekenen = async () => {
    setBezig(true);
    try {
      const res = await fetch(`/api/medewerker/contracten/${encodeURIComponent(contract.id)}/onderteken-link`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        toast.error(body.error || 'Ondertekenen openen mislukt');
        return;
      }
      window.location.href = body.url;
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Er ging iets mis');
    } finally {
      setBezig(false);
    }
  };

  return (
    <div
      className={`bg-[var(--mp-card)] rounded-[var(--mp-radius)] shadow-[var(--mp-shadow)] p-5 border ${
        highlight ? 'border-[var(--mp-accent)]/30' : 'border-transparent'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-[var(--mp-text-primary)] truncate">{contract.titel}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 text-sm text-[var(--mp-text-secondary)]">
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
          <button
            type="button"
            onClick={openOndertekenen}
            disabled={bezig}
            className="px-4 py-2 text-sm font-semibold bg-[var(--mp-accent)] text-white rounded-xl hover:bg-[var(--mp-accent-dark)] disabled:opacity-50 whitespace-nowrap"
          >
            {bezig ? 'Openen…' : 'Ondertekenen'}
          </button>
        )}
      </div>
    </div>
  );
}

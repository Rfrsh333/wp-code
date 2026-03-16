'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import SignaturePad from '@/components/contract/SignaturePad';
import type { TemplateSectie } from '@/types/contracten';

interface ContractData {
  id: string;
  contract_nummer: string;
  titel: string;
  type: string;
  status: string;
  startdatum: string | null;
  einddatum: string | null;
  contract_data: Record<string, unknown>;
  template: {
    id: string;
    naam: string;
    inhoud: {
      secties: TemplateSectie[];
      variabelen: { naam: string; label: string }[];
    };
  } | null;
  medewerker: {
    id: string;
    naam: string;
    voornaam: string;
    achternaam: string;
  } | null;
}

function replaceVariabelen(tekst: string, data: Record<string, unknown>): string {
  return tekst.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value != null ? String(value) : `___________`;
  });
}

export default function ContractOndertekeningClient() {
  const params = useParams();
  const token = params.token as string;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [adminSign, setAdminSign] = useState<{ ondertekenaar_naam: string; getekend_at: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [handtekeningData, setHandtekeningData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [akkoord, setAkkoord] = useState(false);

  useEffect(() => {
    const loadContract = async () => {
      if (!token) {
        setError('Ongeldige link.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/contract/ondertekenen?token=${encodeURIComponent(token)}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Contract niet gevonden.');
          setIsLoading(false);
          return;
        }

        const medewerker = Array.isArray(result.contract.medewerker)
          ? result.contract.medewerker[0]
          : result.contract.medewerker;

        setContract({ ...result.contract, medewerker });
        setAdminSign(result.admin_ondertekening);
        setIsLoading(false);
      } catch {
        setError('Er ging iets mis bij het laden.');
        setIsLoading(false);
      }
    };

    void loadContract();
  }, [token]);

  const handleSubmit = useCallback(async () => {
    if (!contract || !handtekeningData || !akkoord) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/contract/ondertekenen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ondertekenaar_naam: contract.medewerker?.naam || 'Onbekend',
          handtekening_data: handtekeningData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Ondertekening mislukt.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.');
      setIsSubmitting(false);
    }
  }, [contract, handtekeningData, akkoord, token]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#F27501] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Contract laden...</p>
        </div>
      </div>
    );
  }

  // Error state (no contract)
  if (error && !contract) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Oeps</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">&#10003;</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Contract ondertekend!</h1>
          <p className="text-gray-600 mb-4">
            Bedankt voor het ondertekenen van je contract. Je ontvangt een bevestiging per email.
          </p>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>{contract?.contract_nummer}</strong> - {contract?.titel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const secties = contract.template?.inhoud?.secties || [];
  const sortedSecties = [...secties].sort((a, b) => a.volgorde - b.volgorde);

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#F27501] to-[#d96800] p-6 text-white">
            <h1 className="text-2xl font-bold">TopTalent Jobs</h1>
            <p className="text-white/80 text-sm">Contract ter ondertekening</p>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-orange-50 rounded-lg px-4 py-2 border-l-4 border-[#F27501]">
                <p className="text-xs text-gray-500 uppercase">Contractnummer</p>
                <p className="font-bold text-gray-900">{contract.contract_nummer}</p>
              </div>
              <div className="bg-orange-50 rounded-lg px-4 py-2 border-l-4 border-[#F27501]">
                <p className="text-xs text-gray-500 uppercase">Type</p>
                <p className="font-bold text-gray-900 capitalize">{contract.type.replace(/_/g, ' ')}</p>
              </div>
              {contract.startdatum && (
                <div className="bg-orange-50 rounded-lg px-4 py-2 border-l-4 border-[#F27501]">
                  <p className="text-xs text-gray-500 uppercase">Startdatum</p>
                  <p className="font-bold text-gray-900">
                    {new Date(contract.startdatum + 'T00:00:00').toLocaleDateString('nl-NL')}
                  </p>
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900">{contract.titel}</h2>
            {contract.medewerker && (
              <p className="text-gray-600 mt-1">
                Beste {contract.medewerker.voornaam || contract.medewerker.naam},
              </p>
            )}
          </div>
        </div>

        {/* Contract Inhoud */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-3">Contractinhoud</h3>

          {sortedSecties.map((sectie, index) => (
            <div key={index} className="space-y-2">
              <h4 className="font-semibold text-gray-800">{sectie.titel}</h4>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {replaceVariabelen(sectie.tekst, contract.contract_data)}
              </p>
            </div>
          ))}
        </div>

        {/* Admin handtekening (als die er al is) */}
        {adminSign && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Ondertekend door werkgever</h3>
            <p className="text-gray-600">
              <strong>{adminSign.ondertekenaar_naam}</strong> heeft dit contract ondertekend op{' '}
              {new Date(adminSign.getekend_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              .
            </p>
          </div>
        )}

        {/* Ondertekening */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Uw handtekening</h3>

          <SignaturePad
            onSave={(dataUrl) => setHandtekeningData(dataUrl)}
            onClear={() => setHandtekeningData('')}
            label="Teken hieronder uw handtekening"
          />

          {/* Akkoord checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={akkoord}
              onChange={(e) => setAkkoord(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#F27501] focus:ring-[#F27501]"
            />
            <span className="text-sm text-gray-600">
              Ik heb het contract gelezen en ga akkoord met de inhoud en voorwaarden.
              Door te ondertekenen bevestig ik dat mijn digitale handtekening rechtsgeldig is.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!handtekeningData || !akkoord || isSubmitting}
            className="w-full py-3 px-6 bg-[#F27501] text-white font-bold rounded-xl hover:bg-[#d96800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Bezig met ondertekenen...' : 'Contract ondertekenen'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 pb-8">
          TopTalent Jobs B.V. | Utrecht | KvK: 73401161
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import SignaturePad from '@/components/contract/SignaturePad';
import type {
  ContractMetRelaties,
  ContractStatus,
  ContractType,
  ContractTemplate,
  TemplateVariabele,
} from '@/types/contracten';

const statusLabels: Record<ContractStatus, string> = {
  concept: 'Concept',
  verzonden: 'Verzonden',
  bekeken: 'Bekeken',
  ondertekend_medewerker: 'Getekend (MW)',
  ondertekend_admin: 'Getekend (Admin)',
  actief: 'Actief',
  verlopen: 'Verlopen',
  opgezegd: 'Opgezegd',
  geannuleerd: 'Geannuleerd',
};

const statusColors: Record<ContractStatus, string> = {
  concept: 'bg-gray-100 text-gray-700',
  verzonden: 'bg-blue-100 text-blue-700',
  bekeken: 'bg-yellow-100 text-yellow-700',
  ondertekend_medewerker: 'bg-purple-100 text-purple-700',
  ondertekend_admin: 'bg-indigo-100 text-indigo-700',
  actief: 'bg-green-100 text-green-700',
  verlopen: 'bg-red-100 text-red-700',
  opgezegd: 'bg-orange-100 text-orange-700',
  geannuleerd: 'bg-neutral-100 text-neutral-500',
};

const typeLabels: Record<ContractType, string> = {
  arbeidsovereenkomst: 'Arbeidsovereenkomst',
  uitzendovereenkomst: 'Uitzendovereenkomst',
  oproepovereenkomst: 'Oproepovereenkomst',
  freelance: 'Freelance',
  stage: 'Stage',
  custom: 'Overig',
};

export default function ContractenTab() {
  const [contracten, setContracten] = useState<ContractMetRelaties[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('alle');
  const [zoekterm, setZoekterm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractMetRelaties | null>(null);

  // Nieuw contract form
  const [formData, setFormData] = useState({
    template_id: '',
    medewerker_id: '',
    klant_id: '',
    type: 'uitzendovereenkomst' as ContractType,
    titel: '',
    startdatum: '',
    einddatum: '',
    notities: '',
    contract_data: {} as Record<string, string>,
  });

  // Medewerkers voor dropdown
  const [medewerkers, setMedewerkers] = useState<{ id: string; naam: string; email: string }[]>([]);

  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }, []);

  const fetchContracten = useCallback(async () => {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (statusFilter !== 'alle') params.set('status', statusFilter);
    if (zoekterm) params.set('zoekterm', zoekterm);

    const res = await fetch(`/api/admin/contracten?${params}`, { headers });
    const { data } = await res.json();
    setContracten(data || []);
    setIsLoading(false);
  }, [getAuthHeader, statusFilter, zoekterm]);

  const fetchTemplates = useCallback(async () => {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/contract-templates', { headers });
    const { data } = await res.json();
    setTemplates(data || []);
  }, [getAuthHeader]);

  const fetchMedewerkers = useCallback(async () => {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/medewerkers', { headers });
    const { data } = await res.json();
    setMedewerkers((data || []).map((m: { id: string; naam: string; email: string }) => ({
      id: m.id, naam: m.naam, email: m.email,
    })));
  }, [getAuthHeader]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchContracten();
    fetchTemplates();
    fetchMedewerkers();
  }, [fetchContracten, fetchTemplates, fetchMedewerkers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCreate = async () => {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/contracten', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        data: {
          template_id: formData.template_id || undefined,
          medewerker_id: formData.medewerker_id,
          klant_id: formData.klant_id || undefined,
          type: formData.type,
          titel: formData.titel,
          startdatum: formData.startdatum || undefined,
          einddatum: formData.einddatum || undefined,
          notities: formData.notities || undefined,
          contract_data: formData.contract_data,
        },
      }),
    });

    if (res.ok) {
      setShowModal(false);
      resetForm();
      fetchContracten();
    }
  };

  const handleVerzend = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit contract wilt verzenden naar de medewerker?')) return;
    const headers = await getAuthHeader();
    await fetch('/api/admin/contracten', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verzend', id }),
    });
    fetchContracten();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit contract wilt verwijderen?')) return;
    const headers = await getAuthHeader();
    await fetch('/api/admin/contracten', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchContracten();
  };

  const handleAdminSign = async (id: string, handtekeningData: string) => {
    const headers = await getAuthHeader();
    await fetch('/api/admin/contracten', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'teken_admin',
        id,
        handtekening_data: handtekeningData,
        ondertekenaar_naam: 'TopTalent Jobs B.V.',
      }),
    });
    setShowSignModal(null);
    fetchContracten();
  };

  const resetForm = () => {
    setFormData({
      template_id: '', medewerker_id: '', klant_id: '',
      type: 'uitzendovereenkomst', titel: '', startdatum: '',
      einddatum: '', notities: '', contract_data: {},
    });
  };

  const selectedTemplate = templates.find((t) => t.id === formData.template_id);

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setFormData((prev) => ({
      ...prev,
      template_id: templateId,
      type: template?.type || prev.type,
      titel: template?.naam || prev.titel,
    }));
  };

  // Stats
  const stats = {
    totaal: contracten.length,
    concept: contracten.filter((c) => c.status === 'concept').length,
    verzonden: contracten.filter((c) => ['verzonden', 'bekeken'].includes(c.status)).length,
    actief: contracten.filter((c) => c.status === 'actief').length,
    wacht: contracten.filter((c) => ['ondertekend_medewerker', 'ondertekend_admin'].includes(c.status)).length,
  };

  const filteredContracten = contracten.filter((c) => {
    if (statusFilter !== 'alle' && c.status !== statusFilter) return false;
    if (zoekterm) {
      const term = zoekterm.toLowerCase();
      const medewerker = Array.isArray(c.medewerker) ? c.medewerker[0] : c.medewerker;
      return (
        c.titel.toLowerCase().includes(term) ||
        c.contract_nummer.toLowerCase().includes(term) ||
        (medewerker?.naam || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Contracten</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nieuw contract
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Totaal', value: stats.totaal, color: 'bg-neutral-50' },
          { label: 'Concept', value: stats.concept, color: 'bg-gray-50' },
          { label: 'Wacht op handtekening', value: stats.verzonden + stats.wacht, color: 'bg-blue-50' },
          { label: 'Actief', value: stats.actief, color: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-4`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          {[
            { id: 'alle', label: 'Alle' },
            { id: 'concept', label: 'Concept' },
            { id: 'verzonden', label: 'Verzonden' },
            { id: 'actief', label: 'Actief' },
            { id: 'verlopen', label: 'Verlopen' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === f.id
                  ? 'bg-white text-neutral-900 shadow-sm font-medium'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Zoeken op naam, nummer..."
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
        />
      </div>

      {/* Contracten lijst */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#F27501] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Laden...</p>
        </div>
      ) : filteredContracten.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200">
          <p className="text-gray-500">Geen contracten gevonden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContracten.map((contract) => {
            const medewerker = Array.isArray(contract.medewerker)
              ? contract.medewerker[0]
              : contract.medewerker;
            const klant = Array.isArray(contract.klant)
              ? contract.klant[0]
              : contract.klant;

            return (
              <div
                key={contract.id}
                className="bg-white rounded-2xl border border-neutral-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {contract.titel}
                      </h3>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColors[contract.status]}`}>
                        {statusLabels[contract.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                      <span>{contract.contract_nummer}</span>
                      <span>{typeLabels[contract.type as ContractType] || contract.type}</span>
                      {medewerker && <span>{medewerker.naam}</span>}
                      {klant && <span>{klant.bedrijfsnaam}</span>}
                      {contract.startdatum && (
                        <span>
                          Start: {new Date(contract.startdatum + 'T00:00:00').toLocaleDateString('nl-NL')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {contract.status === 'concept' && (
                      <>
                        <button
                          onClick={() => handleVerzend(contract.id)}
                          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Verzenden
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Verwijder
                        </button>
                      </>
                    )}
                    {contract.status === 'ondertekend_medewerker' && (
                      <button
                        onClick={() => setShowSignModal(contract.id)}
                        className="px-3 py-1.5 text-sm bg-[#F27501] text-white rounded-lg hover:bg-[#d96800]"
                      >
                        Tekenen (Admin)
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedContract(
                        selectedContract?.id === contract.id ? null : contract
                      )}
                      className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg"
                    >
                      {selectedContract?.id === contract.id ? 'Sluiten' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedContract?.id === contract.id && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-500">Aangemaakt door:</span>{' '}
                      <span className="text-neutral-900">{contract.aangemaakt_door}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Aangemaakt op:</span>{' '}
                      <span className="text-neutral-900">
                        {new Date(contract.created_at).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                    {contract.verzonden_at && (
                      <div>
                        <span className="text-neutral-500">Verzonden op:</span>{' '}
                        <span className="text-neutral-900">
                          {new Date(contract.verzonden_at).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    )}
                    {contract.ondertekend_medewerker_at && (
                      <div>
                        <span className="text-neutral-500">Getekend (MW):</span>{' '}
                        <span className="text-neutral-900">
                          {new Date(contract.ondertekend_medewerker_at).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    )}
                    {contract.ondertekend_admin_at && (
                      <div>
                        <span className="text-neutral-500">Getekend (Admin):</span>{' '}
                        <span className="text-neutral-900">
                          {new Date(contract.ondertekend_admin_at).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    )}
                    {contract.notities && (
                      <div className="col-span-2">
                        <span className="text-neutral-500">Notities:</span>{' '}
                        <span className="text-neutral-900">{contract.notities}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nieuw Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-lg font-bold text-neutral-900">Nieuw Contract</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Template selectie */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Template</label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                >
                  <option value="">Selecteer template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.naam} ({typeLabels[t.type]})</option>
                  ))}
                </select>
              </div>

              {/* Medewerker */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Medewerker *</label>
                <select
                  value={formData.medewerker_id}
                  onChange={(e) => setFormData((p) => ({ ...p, medewerker_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                >
                  <option value="">Selecteer medewerker...</option>
                  {medewerkers.map((m) => (
                    <option key={m.id} value={m.id}>{m.naam} ({m.email})</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as ContractType }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                >
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Titel */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Titel *</label>
                <input
                  type="text"
                  value={formData.titel}
                  onChange={(e) => setFormData((p) => ({ ...p, titel: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="Titel van het contract"
                />
              </div>

              {/* Datums */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Startdatum</label>
                  <input
                    type="date"
                    value={formData.startdatum}
                    onChange={(e) => setFormData((p) => ({ ...p, startdatum: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Einddatum</label>
                  <input
                    type="date"
                    value={formData.einddatum}
                    onChange={(e) => setFormData((p) => ({ ...p, einddatum: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  />
                </div>
              </div>

              {/* Template variabelen */}
              {selectedTemplate?.inhoud?.variabelen && selectedTemplate.inhoud.variabelen.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <p className="text-sm font-medium text-neutral-700">Template variabelen</p>
                  {selectedTemplate.inhoud.variabelen.map((v: TemplateVariabele) => (
                    <div key={v.naam}>
                      <label className="block text-sm text-neutral-600 mb-1">
                        {v.label} {v.verplicht && '*'}
                      </label>
                      <input
                        type={v.type === 'number' ? 'number' : v.type === 'date' ? 'date' : 'text'}
                        value={formData.contract_data[v.naam] || ''}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            contract_data: { ...p.contract_data, [v.naam]: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Notities */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notities</label>
                <textarea
                  value={formData.notities}
                  onChange={(e) => setFormData((p) => ({ ...p, notities: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
                  placeholder="Interne notities..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.medewerker_id || !formData.titel}
                className="px-4 py-2 text-sm bg-[#F27501] text-white rounded-xl hover:bg-[#d96800] disabled:opacity-40"
              >
                Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Contract tekenen als admin</h3>
            <SignaturePad
              onSave={(dataUrl) => handleAdminSign(showSignModal, dataUrl)}
              label="Admin handtekening"
            />
            <button
              onClick={() => setShowSignModal(null)}
              className="mt-4 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-xl"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

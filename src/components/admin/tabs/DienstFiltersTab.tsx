'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Categorie {
  id: string;
  naam: string;
  slug: string;
  icon: string | null;
  volgorde: number;
  actief: boolean;
}

interface Functie {
  id: string;
  categorie_id: string;
  naam: string;
  slug: string;
  actief: boolean;
  volgorde: number;
}

interface Tag {
  id: string;
  naam: string;
  slug: string;
  kleur: string;
  actief: boolean;
  volgorde: number;
}

export default function DienstFiltersTab() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dienst-filters'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dienst-filters');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{
        categorieen: Categorie[];
        functies: Functie[];
        tags: Tag[];
      }>;
    },
  });

  // Mutations
  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/admin/dienst-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Mutation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dienst-filters'] });
      queryClient.invalidateQueries({ queryKey: ['dienst-filters'] }); // Invalideer ook public endpoint
      toast.success('Opgeslagen');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-48" />
          <div className="h-64 bg-neutral-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Filter Beheer</h1>
        <p className="text-neutral-600 mt-1">
          Beheer categorieën, functies en tags voor het diensten filter systeem
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categorieën */}
        <CategorieenSection
          categorieen={data?.categorieen || []}
          onMutate={mutation.mutate}
        />

        {/* Functies */}
        <FunctiesSection
          functies={data?.functies || []}
          categorieen={data?.categorieen || []}
          onMutate={mutation.mutate}
        />

        {/* Tags */}
        <TagsSection
          tags={data?.tags || []}
          onMutate={mutation.mutate}
        />
      </div>
    </div>
  );
}

// === CATEGORIEËN SECTIE ===
function CategorieenSection({
  categorieen,
  onMutate,
}: {
  categorieen: Categorie[];
  onMutate: (data: Record<string, unknown>) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNaam, setNewNaam] = useState('');
  const [newIcon, setNewIcon] = useState('');

  const handleAdd = () => {
    if (!newNaam.trim()) return;
    onMutate({
      action: 'create_categorie',
      data: { naam: newNaam, icon: newIcon || null },
    });
    setNewNaam('');
    setNewIcon('');
    setIsAdding(false);
  };

  const handleToggleActief = (id: string, actief: boolean) => {
    onMutate({
      action: 'update_categorie',
      id,
      data: { actief: !actief },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Weet je zeker dat je deze categorie wil verwijderen? Alle functies worden ook verwijderd.')) {
      onMutate({ action: 'delete_categorie', id });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Categorieën</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 text-[#F27501] hover:bg-orange-50 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        {isAdding && (
          <div className="p-3 bg-neutral-50 rounded-lg space-y-2">
            <input
              type="text"
              placeholder="Categorie naam"
              value={newNaam}
              onChange={(e) => setNewNaam(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Icon naam (optioneel, bijv. Truck)"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 bg-[#F27501] text-white rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                Toevoegen
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewNaam('');
                  setNewIcon('');
                }}
                className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-sm hover:bg-neutral-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {categorieen
          .sort((a, b) => a.volgorde - b.volgorde)
          .map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg group hover:bg-neutral-100 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-neutral-400" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-neutral-900 truncate">
                  {cat.naam}
                </div>
                {cat.icon && (
                  <div className="text-xs text-neutral-500">Icon: {cat.icon}</div>
                )}
              </div>
              <button
                onClick={() => handleToggleActief(cat.id, cat.actief)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  cat.actief
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                }`}
              >
                {cat.actief ? 'Actief' : 'Inactief'}
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

// === FUNCTIES SECTIE ===
function FunctiesSection({
  functies,
  categorieen,
  onMutate,
}: {
  functies: Functie[];
  categorieen: Categorie[];
  onMutate: (data: Record<string, unknown>) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNaam, setNewNaam] = useState('');
  const [newCategorieId, setNewCategorieId] = useState('');

  const handleAdd = () => {
    if (!newNaam.trim() || !newCategorieId) return;
    onMutate({
      action: 'create_functie',
      data: { naam: newNaam, categorie_id: newCategorieId },
    });
    setNewNaam('');
    setIsAdding(false);
  };

  const handleToggleActief = (id: string, actief: boolean) => {
    onMutate({
      action: 'update_functie',
      id,
      data: { actief: !actief },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Weet je zeker dat je deze functie wil verwijderen?')) {
      onMutate({ action: 'delete_functie', id });
    }
  };

  // Groepeer functies per categorie
  const functiesPerCategorie = categorieen.map((cat) => ({
    categorie: cat,
    functies: functies.filter((f) => f.categorie_id === cat.id).sort((a, b) => a.volgorde - b.volgorde),
  }));

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Functies</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 text-[#F27501] hover:bg-orange-50 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {isAdding && (
          <div className="p-3 bg-neutral-50 rounded-lg space-y-2 sticky top-0 z-10">
            <select
              value={newCategorieId}
              onChange={(e) => setNewCategorieId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            >
              <option value="">Selecteer categorie</option>
              {categorieen.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.naam}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Functie naam"
              value={newNaam}
              onChange={(e) => setNewNaam(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 bg-[#F27501] text-white rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                Toevoegen
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewNaam('');
                  setNewCategorieId('');
                }}
                className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-sm hover:bg-neutral-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {functiesPerCategorie.map(({ categorie, functies: catFuncties }) => (
          <div key={categorie.id}>
            <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">
              {categorie.naam} ({catFuncties.length})
            </div>
            <div className="space-y-1">
              {catFuncties.map((func) => (
                <div
                  key={func.id}
                  className="flex items-center gap-2 p-2 bg-neutral-50 rounded group hover:bg-neutral-100 transition-colors"
                >
                  <GripVertical className="w-3 h-3 text-neutral-400" />
                  <div className="flex-1 text-sm text-neutral-900 truncate">
                    {func.naam}
                  </div>
                  <button
                    onClick={() => handleToggleActief(func.id, func.actief)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      func.actief
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {func.actief ? '✓' : '✗'}
                  </button>
                  <button
                    onClick={() => handleDelete(func.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === TAGS SECTIE ===
function TagsSection({
  tags,
  onMutate,
}: {
  tags: Tag[];
  onMutate: (data: Record<string, unknown>) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNaam, setNewNaam] = useState('');
  const [newKleur, setNewKleur] = useState('#6B7280');

  const handleAdd = () => {
    if (!newNaam.trim()) return;
    onMutate({
      action: 'create_tag',
      data: { naam: newNaam, kleur: newKleur },
    });
    setNewNaam('');
    setNewKleur('#6B7280');
    setIsAdding(false);
  };

  const handleToggleActief = (id: string, actief: boolean) => {
    onMutate({
      action: 'update_tag',
      id,
      data: { actief: !actief },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Weet je zeker dat je deze tag wil verwijderen?')) {
      onMutate({ action: 'delete_tag', id });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Tags</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 text-[#F27501] hover:bg-orange-50 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        {isAdding && (
          <div className="p-3 bg-neutral-50 rounded-lg space-y-2">
            <input
              type="text"
              placeholder="Tag naam"
              value={newNaam}
              onChange={(e) => setNewNaam(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newKleur}
                onChange={(e) => setNewKleur(e.target.value)}
                className="w-12 h-10 border border-neutral-300 rounded cursor-pointer"
              />
              <span className="text-sm text-neutral-600">{newKleur}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 bg-[#F27501] text-white rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                Toevoegen
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewNaam('');
                  setNewKleur('#6B7280');
                }}
                className="px-3 py-1.5 bg-neutral-200 text-neutral-700 rounded-lg text-sm hover:bg-neutral-300 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {tags
          .sort((a, b) => a.volgorde - b.volgorde)
          .map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg group hover:bg-neutral-100 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-neutral-400" />
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: tag.kleur }}
              />
              <div className="flex-1 text-sm font-medium text-neutral-900 truncate">
                {tag.naam}
              </div>
              <button
                onClick={() => handleToggleActief(tag.id, tag.actief)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  tag.actief
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                }`}
              >
                {tag.actief ? 'Actief' : 'Inactief'}
              </button>
              <button
                onClick={() => handleDelete(tag.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

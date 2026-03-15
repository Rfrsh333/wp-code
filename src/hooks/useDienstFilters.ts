'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DienstFilters, CategorieMetFuncties, DienstTag } from '@/types/dienst-filters';

export function useDienstFilters() {
  const [filters, setFilters] = useState<DienstFilters>({
    categorieen: [],
    functies: [],
    taal: null,
    tags: [],
  });

  // Haal filter opties op uit database
  const { data: filterOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ['dienst-filters'],
    queryFn: async () => {
      const res = await fetch('/api/dienst-filters');
      if (!res.ok) throw new Error('Failed to fetch filters');
      return res.json() as Promise<{
        categorieen: CategorieMetFuncties[];
        tags: DienstTag[];
      }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minuten - filters veranderen niet vaak
  });

  // Toggle functies
  const toggleCategorie = useCallback((slug: string) => {
    setFilters(prev => {
      const isSelected = prev.categorieen.includes(slug);
      if (isSelected) {
        // Verwijder categorie EN alle functies van die categorie
        const categorie = filterOptions?.categorieen.find(c => c.slug === slug);
        const functieSlugs = categorie?.functies.map(f => f.slug) || [];
        return {
          ...prev,
          categorieen: prev.categorieen.filter(c => c !== slug),
          functies: prev.functies.filter(f => !functieSlugs.includes(f)),
        };
      } else {
        return { ...prev, categorieen: [...prev.categorieen, slug] };
      }
    });
  }, [filterOptions]);

  const toggleFunctie = useCallback((slug: string) => {
    setFilters(prev => ({
      ...prev,
      functies: prev.functies.includes(slug)
        ? prev.functies.filter(f => f !== slug)
        : [...prev.functies, slug],
    }));
  }, []);

  const setTaal = useCallback((taal: 'nl' | 'en' | null) => {
    setFilters(prev => ({ ...prev, taal }));
  }, []);

  const toggleTag = useCallback((slug: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(slug)
        ? prev.tags.filter(t => t !== slug)
        : [...prev.tags, slug],
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ categorieen: [], functies: [], taal: null, tags: [] });
  }, []);

  const clearCategorieen = useCallback(() => {
    setFilters(prev => ({ ...prev, categorieen: [], functies: [] }));
  }, []);

  const clearTags = useCallback(() => {
    setFilters(prev => ({ ...prev, tags: [] }));
  }, []);

  const activeFilterCount = useMemo(() => {
    return filters.categorieen.length + filters.functies.length + (filters.taal ? 1 : 0) + filters.tags.length;
  }, [filters]);

  // Bouw query string voor API
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.categorieen.length) params.set('categorie', filters.categorieen.join(','));
    if (filters.functies.length) params.set('functie_filter', filters.functies.join(','));
    if (filters.taal) params.set('taal', filters.taal);
    if (filters.tags.length) params.set('tags', filters.tags.join(','));
    return params.toString();
  }, [filters]);

  return {
    filters,
    filterOptions,
    optionsLoading,
    toggleCategorie,
    toggleFunctie,
    setTaal,
    toggleTag,
    clearAll,
    clearCategorieen,
    clearTags,
    activeFilterCount,
    queryString,
  };
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X, Filter as FilterIcon } from 'lucide-react';
import { useDienstFilters } from '@/hooks/useDienstFilters';
import type { CategorieMetFuncties } from '@/types/dienst-filters';

interface DienstenFiltersProps {
  onQueryChange: (query: string) => void;
}

export default function DienstenFilters({ onQueryChange }: DienstenFiltersProps) {
  const {
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
  } = useDienstFilters();

  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['talen', 'categorieen']));
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Update parent query string when filters change
  useEffect(() => {
    onQueryChange(queryString);
  }, [queryString, onQueryChange]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleCategory = (slug: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Check if categorie is indeterminate (some functies selected but not all)
  const getCategorieCheckState = (cat: CategorieMetFuncties) => {
    const catSelected = filters.categorieen.includes(cat.slug);
    const functieSelected = cat.functies.filter(f => filters.functies.includes(f.slug));

    if (catSelected) return 'checked';
    if (functieSelected.length > 0) return 'indeterminate';
    return 'unchecked';
  };

  if (optionsLoading) {
    return (
      <div className="mb-6 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-5 w-5 bg-neutral-200 rounded" />
          <div className="h-5 flex-1 bg-neutral-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Header - Collapsed State */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <FilterIcon className="w-5 h-5 text-neutral-600" />
          <span className="font-semibold text-neutral-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-[#F27501] text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="px-3 py-1 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Wis alles
            </button>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && !isOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.taal && (
            <FilterChip
              label={filters.taal === 'nl' ? 'Nederlands' : 'Engels'}
              onRemove={() => setTaal(null)}
            />
          )}
          {filterOptions?.categorieen
            .filter(cat => filters.categorieen.includes(cat.slug))
            .map(cat => (
              <FilterChip
                key={cat.slug}
                label={cat.naam}
                onRemove={() => toggleCategorie(cat.slug)}
              />
            ))}
          {filterOptions?.categorieen
            .flatMap(cat => cat.functies)
            .filter(func => filters.functies.includes(func.slug))
            .map(func => (
              <FilterChip
                key={func.slug}
                label={func.naam}
                onRemove={() => toggleFunctie(func.slug)}
              />
            ))}
          {filterOptions?.tags
            .filter(tag => filters.tags.includes(tag.slug))
            .map(tag => (
              <FilterChip
                key={tag.slug}
                label={tag.naam}
                color={tag.kleur}
                onRemove={() => toggleTag(tag.slug)}
              />
            ))}
        </div>
      )}

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-5 bg-white rounded-2xl border border-neutral-100 shadow-sm space-y-4">
              {/* Talen */}
              <FilterSection
                title="Vereiste talen"
                isOpen={openSections.has('talen')}
                onToggle={() => toggleSection('talen')}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="taal"
                      checked={filters.taal === null}
                      onChange={() => setTaal(null)}
                      className="w-4 h-4 text-[#F27501] focus:ring-[#F27501]"
                    />
                    <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                      Alle talen
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="taal"
                      checked={filters.taal === 'nl'}
                      onChange={() => setTaal('nl')}
                      className="w-4 h-4 text-[#F27501] focus:ring-[#F27501]"
                    />
                    <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                      Alleen Nederlands
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="taal"
                      checked={filters.taal === 'en'}
                      onChange={() => setTaal('en')}
                      className="w-4 h-4 text-[#F27501] focus:ring-[#F27501]"
                    />
                    <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                      Alleen Engels
                    </span>
                  </label>
                </div>
              </FilterSection>

              {/* Categorieën & Functies */}
              <FilterSection
                title="Categorieën"
                isOpen={openSections.has('categorieen')}
                onToggle={() => toggleSection('categorieen')}
                onClear={filters.categorieen.length + filters.functies.length > 0 ? clearCategorieen : undefined}
              >
                <div className="space-y-1">
                  {filterOptions?.categorieen.map(cat => {
                    const checkState = getCategorieCheckState(cat);
                    const isExpanded = openCategories.has(cat.slug);

                    return (
                      <div key={cat.slug}>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer group flex-1">
                            <input
                              type="checkbox"
                              checked={checkState === 'checked'}
                              ref={el => {
                                if (el) el.indeterminate = checkState === 'indeterminate';
                              }}
                              onChange={() => toggleCategorie(cat.slug)}
                              className="w-4 h-4 text-[#F27501] focus:ring-[#F27501] rounded"
                            />
                            <span className="text-sm font-medium text-neutral-800 group-hover:text-neutral-900">
                              {cat.naam}
                            </span>
                            <span className="text-xs text-neutral-500">
                              ({cat.functies.length})
                            </span>
                          </label>
                          {cat.functies.length > 0 && (
                            <button
                              onClick={() => toggleCategory(cat.slug)}
                              className="p-1 hover:bg-neutral-100 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-neutral-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-neutral-600" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Nested functies */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="ml-6 mt-1 space-y-1 overflow-hidden"
                            >
                              {cat.functies.map(func => (
                                <label
                                  key={func.slug}
                                  className="flex items-center gap-2 cursor-pointer group"
                                >
                                  <input
                                    type="checkbox"
                                    checked={filters.functies.includes(func.slug)}
                                    onChange={() => toggleFunctie(func.slug)}
                                    className="w-4 h-4 text-[#F27501] focus:ring-[#F27501] rounded"
                                  />
                                  <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                                    {func.naam}
                                  </span>
                                </label>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Tags */}
              <FilterSection
                title="Tags"
                isOpen={openSections.has('tags')}
                onToggle={() => toggleSection('tags')}
                onClear={filters.tags.length > 0 ? clearTags : undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {filterOptions?.tags.map(tag => (
                    <label
                      key={tag.slug}
                      className="cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.tags.includes(tag.slug)}
                        onChange={() => toggleTag(tag.slug)}
                        className="sr-only peer"
                      />
                      <div
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all"
                        style={{
                          borderColor: filters.tags.includes(tag.slug) ? tag.kleur : '#E5E7EB',
                          backgroundColor: filters.tags.includes(tag.slug) ? tag.kleur + '20' : 'white',
                          color: filters.tags.includes(tag.slug) ? tag.kleur : '#6B7280',
                        }}
                      >
                        {tag.naam}
                      </div>
                    </label>
                  ))}
                </div>
              </FilterSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper components
function FilterSection({
  title,
  isOpen,
  onToggle,
  onClear,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neutral-100 last:border-0 pb-4 last:pb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-left group"
      >
        <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-[#F27501] transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
            >
              Wis
            </button>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-neutral-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-600" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  label,
  color = '#F27501',
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove: () => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: color + '20',
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

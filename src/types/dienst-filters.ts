export interface DienstCategorie {
  id: string;
  naam: string;
  slug: string;
  icon: string | null;
  volgorde: number;
  actief: boolean;
}

export interface DienstFunctie {
  id: string;
  categorie_id: string;
  naam: string;
  slug: string;
  actief: boolean;
  volgorde: number;
}

export interface DienstTag {
  id: string;
  naam: string;
  slug: string;
  kleur: string;
  actief: boolean;
  volgorde: number;
}

export interface CategorieMetFuncties extends DienstCategorie {
  functies: DienstFunctie[];
}

export interface DienstFilters {
  categorieen: string[];       // categorie slugs
  functies: string[];          // functie slugs
  taal: 'nl' | 'en' | null;   // vereiste taal filter
  tags: string[];              // tag slugs
}

export const EMPTY_FILTERS: DienstFilters = {
  categorieen: [],
  functies: [],
  taal: null,
  tags: [],
};

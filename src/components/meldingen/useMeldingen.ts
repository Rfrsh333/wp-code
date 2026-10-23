"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MeldingCategorie, MeldingUserType, OngelezenTelling } from "@/lib/meldingen/meldingen-regels";

/**
 * Meldingencentrum in de portalen: badge (aantal), lijst per tab (cursor) en gelezen markeren.
 * De API kent de rol uit de sessie; `rol` kiest de juiste als je in beide portalen bent ingelogd.
 */

export type MeldingTab = "alles" | MeldingCategorie;

export type Melding = {
  id: string;
  categorie: MeldingCategorie;
  titel: string;
  tekst: string;
  url: string | null;
  gelezen: boolean;
  gelezen_op: string | null;
  created_at: string;
};

type LijstAntwoord = {
  beschikbaar: boolean;
  meldingen: Melding[];
  volgende_cursor: string | null;
  ongelezen: OngelezenTelling;
};

export const meldingenKeys = {
  alles: (rol: MeldingUserType) => ["meldingen", rol] as const,
  aantal: (rol: MeldingUserType) => ["meldingen", rol, "aantal"] as const,
  lijst: (rol: MeldingUserType, tab: MeldingTab) => ["meldingen", rol, "lijst", tab] as const,
};

/** Badge op de bel. `beschikbaar: false` (geen migratie of geen sessie) = bel verbergen of oud gedrag. */
export function useMeldingenAantal(rol: MeldingUserType) {
  return useQuery({
    queryKey: meldingenKeys.aantal(rol),
    queryFn: async (): Promise<{ totaal: number; beschikbaar: boolean }> => {
      const res = await fetch(`/api/meldingen/aantal/?rol=${rol}`, { cache: "no-store" });
      if (!res.ok) return { totaal: 0, beschikbaar: false };
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function useMeldingenLijst(rol: MeldingUserType, tab: MeldingTab) {
  return useInfiniteQuery({
    queryKey: meldingenKeys.lijst(rol, tab),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<LijstAntwoord> => {
      const params = new URLSearchParams({ rol, limiet: "20" });
      if (tab !== "alles") params.set("categorie", tab);
      if (pageParam) params.set("voor", pageParam);
      const res = await fetch(`/api/meldingen/?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Meldingen ophalen mislukt (${res.status})`);
      return res.json();
    },
    getNextPageParam: (laatste) => laatste.volgende_cursor ?? undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkeerGelezen(rol: MeldingUserType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wat: { id: string } | { alles: true; categorie?: MeldingCategorie }) => {
      const res = await fetch(`/api/meldingen/gelezen/?rol=${rol}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wat),
        // Een tik op een kaart navigeert meteen; het verzoek moet dan toch afkomen.
        keepalive: true,
      });
      if (!res.ok) throw new Error(`Gelezen markeren mislukt (${res.status})`);
      return res.json() as Promise<{ bijgewerkt: number; ongelezen: OngelezenTelling }>;
    },
    onMutate: async (wat) => {
      // Direct zichtbaar: kaart(en) als gelezen tonen en de badge bijwerken.
      const nu = new Date().toISOString();
      const raakt = (m: Melding) => !m.gelezen && ("id" in wat ? m.id === wat.id : !wat.categorie || m.categorie === wat.categorie);
      queryClient.setQueriesData<{ pages: LijstAntwoord[]; pageParams: unknown[] }>({ queryKey: [...meldingenKeys.alles(rol), "lijst"] }, (oud) =>
        oud
          ? { ...oud, pages: oud.pages.map((p) => ({ ...p, meldingen: p.meldingen.map((m) => (raakt(m) ? { ...m, gelezen: true, gelezen_op: nu } : m)) })) }
          : oud,
      );
    },
    onSuccess: (data) => {
      if (data?.ongelezen) {
        queryClient.setQueryData(meldingenKeys.aantal(rol), (oud: { beschikbaar: boolean } | undefined) => ({
          beschikbaar: oud?.beschikbaar ?? true,
          totaal: data.ongelezen.totaal,
        }));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: meldingenKeys.alles(rol) });
    },
  });
}

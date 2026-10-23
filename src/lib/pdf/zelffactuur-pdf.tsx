import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { euroTekst, KOR_VERMELDING, VERMELDING_AFNEMER } from "@/lib/uitbetaling/regels";

/**
 * Zelffactuur (factuur uitgereikt door afnemer, art. 35a Wet OB 1968): TopTalent maakt de factuur
 * namens de zzp'er. Alle bedragen komen als hele centen binnen (lib/uitbetaling/regels.ts) en worden
 * hier alleen opgemaakt; er wordt niets meer berekend.
 */

export type ZelffactuurPdfData = {
  factuur_nummer: string;
  /** YYYY-MM-DD */
  factuur_datum: string;
  leverancier: {
    naam: string;
    adres: string | null;
    postcode: string | null;
    stad: string | null;
    kvk_nummer: string | null;
    btw_nummer: string | null;
  };
  afnemer: {
    naam: string;
    adres: string;
    postcode_stad: string;
    kvk: string;
    btw: string;
  };
  regels: {
    datum: string | null;
    werkgever: string;
    omschrijving: string;
    uren: number;
    uurtarief_centen: number;
    uren_centen: number;
    toeslag_centen: number;
    toeslag_omschrijving: string | null;
    reiskosten_km: number;
    reiskosten_centen: number;
    bedrag_centen: number;
  }[];
  excl_centen: number;
  btw_percentage: number;
  btw_centen: number;
  incl_centen: number;
  kor: boolean;
  /** `op` als YYYY-MM-DD (Nederlandse datum). */
  akkoord: { versie: string | null; op: string | null };
};

const kleuren = {
  primair: "#F27501",
  donker: "#1F1F1F",
  tekst: "#4A4A4A",
  licht: "#6B6B6B",
  rand: "#E5E5E5",
  achtergrond: "#FAFAFA",
};

const s = StyleSheet.create({
  pagina: { fontFamily: "Helvetica", fontSize: 9, color: kleuren.tekst, padding: "32 40" },
  balk: { backgroundColor: kleuren.primair, height: 4, marginBottom: 16 },
  kop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  titel: { fontSize: 18, fontFamily: "Helvetica-Bold", color: kleuren.donker },
  vermelding: {
    marginTop: 6,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: kleuren.primair,
    borderWidth: 1,
    borderColor: kleuren.primair,
    padding: "3 6",
  },
  meta: { textAlign: "right" },
  metaLabel: { color: kleuren.licht },
  adressen: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  adresBlok: { width: "48%" },
  adresRegel: { marginBottom: 2.5 },
  adresTitel: { fontSize: 8, color: kleuren.licht, textTransform: "uppercase", marginBottom: 3 },
  vet: { fontFamily: "Helvetica-Bold", color: kleuren.donker },
  tabelKop: { flexDirection: "row", backgroundColor: kleuren.primair, color: "#FFFFFF", padding: "5 6", fontFamily: "Helvetica-Bold", fontSize: 8 },
  rij: { flexDirection: "row", padding: "5 6", borderBottomWidth: 1, borderBottomColor: kleuren.rand },
  subrij: { flexDirection: "row", padding: "2 6 4 6", color: kleuren.licht, fontSize: 8 },
  kDatum: { width: "12%" },
  kWerkgever: { width: "30%" },
  kUren: { width: "10%", textAlign: "right" },
  kTarief: { width: "14%", textAlign: "right" },
  kExtra: { width: "17%", textAlign: "right" },
  kBedrag: { width: "17%", textAlign: "right" },
  totalen: { marginLeft: "auto", width: 230, marginTop: 12 },
  totaalRij: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totaalEind: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 3,
    borderTopWidth: 1.5,
    borderTopColor: kleuren.primair,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: kleuren.donker,
  },
  kor: { marginTop: 8, fontSize: 8, color: kleuren.donker },
  voet: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 7.5, color: kleuren.licht, lineHeight: 1.5, borderTopWidth: 1, borderTopColor: kleuren.rand, paddingTop: 6 },
});

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** "2026-10-23" → "23 oktober 2026" (zonder tijdzone-effecten). */
function datumLang(d: string | null): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return "";
  const [j, m, dag] = d.slice(0, 10).split("-").map(Number);
  return `${dag} ${MAANDEN[m - 1]} ${j}`;
}

function datumKort(d: string | null): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return "";
  const [j, m, dag] = d.slice(0, 10).split("-");
  return `${dag}-${m}-${j}`;
}

function urenTekst(u: number): string {
  return u.toFixed(2).replace(".", ",");
}

export function ZelffactuurPDF({ data }: { data: ZelffactuurPdfData }) {
  const l = data.leverancier;
  const periode = data.regels.map((r) => r.datum).filter((d): d is string => !!d).sort();
  return (
    <Document title={`Factuur ${data.factuur_nummer}`} author={l.naam} creator={data.afnemer.naam} producer={data.afnemer.naam}>
      <Page size="A4" style={s.pagina}>
        <View style={s.balk} />
        <View style={s.kop}>
          <View>
            <Text style={s.titel}>Factuur</Text>
            <Text style={s.vermelding}>{VERMELDING_AFNEMER}</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.adresRegel}>
              <Text style={s.metaLabel}>Factuurnummer: </Text>
              <Text style={s.vet}>{data.factuur_nummer}</Text>
            </Text>
            <Text style={s.adresRegel}>
              <Text style={s.metaLabel}>Factuurdatum: </Text>
              {datumLang(data.factuur_datum)}
            </Text>
            {periode.length > 0 && (
              <Text style={s.adresRegel}>
                <Text style={s.metaLabel}>Periode diensten: </Text>
                {datumKort(periode[0])} t/m {datumKort(periode[periode.length - 1])}
              </Text>
            )}
          </View>
        </View>

        <View style={s.adressen}>
          <View style={s.adresBlok}>
            <Text style={s.adresTitel}>Van (leverancier)</Text>
            <Text style={[s.vet, s.adresRegel]}>{l.naam}</Text>
            {l.adres ? <Text style={s.adresRegel}>{l.adres}</Text> : null}
            <Text style={s.adresRegel}>{[l.postcode, l.stad].filter(Boolean).join(" ")}</Text>
            {l.kvk_nummer ? <Text style={s.adresRegel}>KvK: {l.kvk_nummer}</Text> : null}
            {l.btw_nummer ? <Text style={s.adresRegel}>Btw-id: {l.btw_nummer}</Text> : null}
          </View>
          <View style={s.adresBlok}>
            <Text style={s.adresTitel}>Aan (afnemer)</Text>
            <Text style={[s.vet, s.adresRegel]}>{data.afnemer.naam}</Text>
            {data.afnemer.adres ? <Text style={s.adresRegel}>{data.afnemer.adres}</Text> : null}
            {data.afnemer.postcode_stad ? <Text style={s.adresRegel}>{data.afnemer.postcode_stad}</Text> : null}
            {data.afnemer.kvk ? <Text style={s.adresRegel}>KvK: {data.afnemer.kvk}</Text> : null}
            {data.afnemer.btw ? <Text style={s.adresRegel}>Btw-id: {data.afnemer.btw}</Text> : null}
          </View>
        </View>

        <View style={s.tabelKop} fixed>
          <Text style={s.kDatum}>Datum</Text>
          <Text style={s.kWerkgever}>Werkgever / dienst</Text>
          <Text style={s.kUren}>Uren</Text>
          <Text style={s.kTarief}>Tarief</Text>
          <Text style={s.kExtra}>Toeslag + reisk.</Text>
          <Text style={s.kBedrag}>Bedrag</Text>
        </View>
        {data.regels.map((r, i) => (
          <View key={i} wrap={false}>
            <View style={s.rij}>
              <Text style={s.kDatum}>{datumKort(r.datum)}</Text>
              <Text style={s.kWerkgever}>{r.werkgever}</Text>
              <Text style={s.kUren}>{urenTekst(r.uren)}</Text>
              <Text style={s.kTarief}>{euroTekst(r.uurtarief_centen)}</Text>
              <Text style={s.kExtra}>{euroTekst(r.toeslag_centen + r.reiskosten_centen)}</Text>
              <Text style={s.kBedrag}>{euroTekst(r.bedrag_centen)}</Text>
            </View>
            <View style={s.subrij}>
              <Text>
                {r.omschrijving}: {urenTekst(r.uren)} uur × {euroTekst(r.uurtarief_centen)} = {euroTekst(r.uren_centen)}
                {r.toeslag_centen > 0 ? ` · ${r.toeslag_omschrijving ?? "Toeslag"}: ${euroTekst(r.toeslag_centen)}` : ""}
                {r.reiskosten_centen > 0 ? ` · Reiskosten ${urenTekst(r.reiskosten_km)} km: ${euroTekst(r.reiskosten_centen)}` : ""}
              </Text>
            </View>
          </View>
        ))}

        <View style={s.totalen} wrap={false}>
          <View style={s.totaalRij}>
            <Text>Totaal excl. btw</Text>
            <Text>{euroTekst(data.excl_centen)}</Text>
          </View>
          <View style={s.totaalRij}>
            <Text>{data.kor ? "Btw (KOR)" : `Btw ${data.btw_percentage}%`}</Text>
            <Text>{euroTekst(data.btw_centen)}</Text>
          </View>
          <View style={s.totaalEind}>
            <Text>Totaal</Text>
            <Text>{euroTekst(data.incl_centen)}</Text>
          </View>
        </View>
        {data.kor && <Text style={s.kor}>{KOR_VERMELDING}.</Text>}

        <View style={s.voet} fixed>
          <Text>
            {VERMELDING_AFNEMER}: deze factuur is namens {l.naam} opgemaakt door {data.afnemer.naam}, op grond van het
            voorafgaande akkoord zelffacturering{data.akkoord.versie ? ` (versie ${data.akkoord.versie}` : ""}
            {data.akkoord.versie && data.akkoord.op ? `, gegeven op ${datumLang(data.akkoord.op)})` : data.akkoord.versie ? ")" : ""}.
            Klopt er iets niet? Meld het volgens de procedure in dat akkoord.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

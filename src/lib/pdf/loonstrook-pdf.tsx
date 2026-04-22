import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ============================================================================
// Types
// ============================================================================

export interface LoonstrookData {
  // Bedrijf
  bedrijfsnaam: string;
  adres: string;
  postcodeStad: string;
  kvk: string;
  loonbelastingnummer: string;

  // Medewerker
  medewerkerNaam: string;
  medewerkerAdres?: string;
  medewerkerPostcodeStad?: string;
  bsn?: string;
  geboortedatum?: string;
  geboorteplaats?: string;
  datum_in_dienst?: string;
  functie?: string;
  loonheffingskorting: boolean;

  // Periode
  periode: string; // bijv. "april 2026"
  periodeNummer: number;
  jaar: number;

  // Uren & Loon
  gewerkte_uren: number;
  bruto_uurloon: number;
  toeslag_uren: number;
  toeslag_percentage: number;

  // Berekeningen
  bruto_loon: number;
  toeslag_bedrag: number;
  vakantietoeslag: number; // 8% reservering
  totaal_bruto: number;
  loonheffing: number;
  premie_zvw: number;
  netto_loon: number;

  // Cumulatief
  cumulatief_bruto: number;
  cumulatief_loonheffing: number;
  cumulatief_netto: number;
}

// ============================================================================
// Styles
// ============================================================================

const colors = {
  primary: "#F27501",
  dark: "#333333",
  text: "#4A4A4A",
  textLight: "#666666",
  border: "#E5E5E5",
  background: "#FAFAFA",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    backgroundColor: colors.white,
    padding: "30 40",
  },
  headerBar: {
    backgroundColor: colors.primary,
    height: 5,
    marginBottom: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textLight,
  },
  companyInfo: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: "right",
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  label: {
    fontSize: 9,
    color: colors.textLight,
    width: "50%",
  },
  value: {
    fontSize: 9,
    color: colors.dark,
    fontWeight: "bold",
    textAlign: "right",
    width: "50%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    padding: "6 8",
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: "5 8",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: 9,
    color: colors.dark,
  },
  totalRow: {
    flexDirection: "row",
    padding: "8 8",
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.dark,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#999999",
    textAlign: "center",
  },
});

// ============================================================================
// Helper
// ============================================================================

function formatCurrency(amount: number): string {
  return `€ ${amount.toFixed(2).replace(".", ",")}`;
}

// ============================================================================
// Component
// ============================================================================

export function LoonstrookPDF({ data }: { data: LoonstrookData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Loonstrook</Text>
            <Text style={styles.subtitle}>
              Periode {data.periodeNummer} - {data.periode} {data.jaar}
            </Text>
          </View>
          <View>
            <Text style={styles.companyInfo}>{data.bedrijfsnaam}</Text>
            <Text style={styles.companyInfo}>{data.adres}</Text>
            <Text style={styles.companyInfo}>{data.postcodeStad}</Text>
            <Text style={styles.companyInfo}>KvK: {data.kvk}</Text>
            <Text style={styles.companyInfo}>Loonheffingen: {data.loonbelastingnummer}</Text>
          </View>
        </View>

        {/* Medewerker gegevens */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medewerker</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Naam</Text>
            <Text style={styles.value}>{data.medewerkerNaam}</Text>
          </View>
          {data.medewerkerAdres && (
            <View style={styles.row}>
              <Text style={styles.label}>Adres</Text>
              <Text style={styles.value}>{data.medewerkerAdres}</Text>
            </View>
          )}
          {data.bsn && (
            <View style={styles.row}>
              <Text style={styles.label}>BSN</Text>
              <Text style={styles.value}>***{data.bsn.slice(-3)}</Text>
            </View>
          )}
          {data.geboortedatum && (
            <View style={styles.row}>
              <Text style={styles.label}>Geboortedatum</Text>
              <Text style={styles.value}>{data.geboortedatum}</Text>
            </View>
          )}
          {data.geboorteplaats && (
            <View style={styles.row}>
              <Text style={styles.label}>Geboorteplaats</Text>
              <Text style={styles.value}>{data.geboorteplaats}</Text>
            </View>
          )}
          {data.datum_in_dienst && (
            <View style={styles.row}>
              <Text style={styles.label}>Datum in dienst</Text>
              <Text style={styles.value}>{data.datum_in_dienst}</Text>
            </View>
          )}
          {data.functie && (
            <View style={styles.row}>
              <Text style={styles.label}>Functie</Text>
              <Text style={styles.value}>{data.functie}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Loonheffingskorting</Text>
            <Text style={styles.value}>{data.loonheffingskorting ? "Ja" : "Nee"}</Text>
          </View>
        </View>

        {/* Loonberekening */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loonberekening</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Omschrijving</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Uren</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "right" }]}>Tarief</Text>
            <Text style={[styles.tableHeaderCell, { width: "25%", textAlign: "right" }]}>Bedrag</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "40%" }]}>Bruto uurloon</Text>
            <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{data.gewerkte_uren.toFixed(1)}</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>{formatCurrency(data.bruto_uurloon)}</Text>
            <Text style={[styles.tableCell, { width: "25%", textAlign: "right" }]}>{formatCurrency(data.bruto_loon)}</Text>
          </View>

          {data.toeslag_bedrag > 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "40%" }]}>Toeslag ({data.toeslag_percentage}%)</Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{data.toeslag_uren.toFixed(1)}</Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}></Text>
              <Text style={[styles.tableCell, { width: "25%", textAlign: "right" }]}>{formatCurrency(data.toeslag_bedrag)}</Text>
            </View>
          )}

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "40%" }]}>Vakantietoeslag (8%)</Text>
            <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}></Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}></Text>
            <Text style={[styles.tableCell, { width: "25%", textAlign: "right" }]}>{formatCurrency(data.vakantietoeslag)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { width: "75%" }]}>Totaal bruto</Text>
            <Text style={[styles.totalValue, { width: "25%" }]}>{formatCurrency(data.totaal_bruto)}</Text>
          </View>
        </View>

        {/* Inhoudingen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inhoudingen</Text>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "75%" }]}>Loonheffing</Text>
            <Text style={[styles.tableCell, { width: "25%", textAlign: "right" }]}>- {formatCurrency(data.loonheffing)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "75%" }]}>Premie ZVW (werknemersdeel)</Text>
            <Text style={[styles.tableCell, { width: "25%", textAlign: "right" }]}>- {formatCurrency(data.premie_zvw)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { width: "75%" }]}>Netto loon</Text>
            <Text style={[styles.totalValue, { width: "25%" }]}>{formatCurrency(data.netto_loon)}</Text>
          </View>
        </View>

        {/* Cumulatief */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cumulatief {data.jaar}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Bruto loon</Text>
            <Text style={styles.value}>{formatCurrency(data.cumulatief_bruto)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Loonheffing</Text>
            <Text style={styles.value}>{formatCurrency(data.cumulatief_loonheffing)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Netto loon</Text>
            <Text style={styles.value}>{formatCurrency(data.cumulatief_netto)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {data.bedrijfsnaam} | KvK: {data.kvk} | Loonheffingen: {data.loonbelastingnummer} | WAADI-geregistreerd
          </Text>
          <Text style={styles.footerText}>
            Dit is een computergegeneerde loonstrook. Bewaar deze voor uw belastingaangifte.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

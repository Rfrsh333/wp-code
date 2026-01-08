import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { CalculatorInputs, Resultaten } from "@/lib/calculator/types";
import { functieLabels, ervaringLabels, dagen, vergelijkingLabels } from "@/lib/calculator/tarieven";

// ============================================================================
// Styles
// ============================================================================

const colors = {
  primary: "#F97316",
  dark: "#1F1F1F",
  gray: "#666666",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  green: "#22C55E",
  red: "#EF4444",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.dark,
  },

  // Header
  header: {
    marginBottom: 30,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 10,
    color: colors.gray,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.dark,
    marginTop: 30,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 20,
  },

  // Sections
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  // Input Summary
  summaryBox: {
    backgroundColor: colors.lightGray,
    padding: 15,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  summaryLabel: {
    width: "40%",
    color: colors.gray,
  },
  summaryValue: {
    width: "60%",
    fontWeight: "bold",
    color: colors.dark,
  },

  // Results Table
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.dark,
    padding: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderCell: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  tableRowAlt: {
    backgroundColor: colors.lightGray,
  },
  tableCell: {
    fontSize: 10,
    color: colors.dark,
  },
  tableCellHighlight: {
    color: colors.primary,
    fontWeight: "bold",
  },

  // Column widths
  colType: { width: "25%" },
  colRate: { width: "15%", textAlign: "right" as const },
  colShift: { width: "15%", textAlign: "right" as const },
  colWeek: { width: "15%", textAlign: "right" as const },
  colMonth: { width: "20%", textAlign: "right" as const },

  // Pros/Cons
  prosConsSection: {
    marginTop: 20,
  },
  prosConsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    color: colors.dark,
  },
  prosConsGrid: {
    flexDirection: "row",
    gap: 15,
  },
  prosConsBox: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    backgroundColor: colors.lightGray,
  },
  prosConsBoxTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: colors.dark,
  },
  prosItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  prosIcon: {
    color: colors.green,
    marginRight: 6,
    fontSize: 10,
  },
  consIcon: {
    color: colors.red,
    marginRight: 6,
    fontSize: 10,
  },
  prosText: {
    fontSize: 9,
    color: colors.gray,
    flex: 1,
  },

  // Tip Box
  tipBox: {
    marginTop: 25,
    padding: 15,
    backgroundColor: "#FFF7F1",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 6,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 10,
    color: colors.gray,
    lineHeight: 1.5,
  },

  // CTA
  ctaSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: colors.dark,
    borderRadius: 8,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 10,
    color: "#CCCCCC",
    marginBottom: 15,
    textAlign: "center",
  },
  ctaContact: {
    flexDirection: "row",
    gap: 20,
  },
  ctaContactItem: {
    fontSize: 10,
    color: colors.primary,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  footerText: {
    fontSize: 8,
    color: colors.gray,
  },
  footerBrand: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: "bold",
  },

  // Disclaimer
  disclaimer: {
    marginTop: 15,
    fontSize: 8,
    color: colors.gray,
    fontStyle: "italic",
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString("nl-NL")}`;
}

function formatCurrencyDecimal(amount: number): string {
  return `€ ${amount.toFixed(2).replace(".", ",")}`;
}

// ============================================================================
// PDF Document Component
// ============================================================================

interface CalculatorPDFProps {
  lead: {
    naam: string;
    bedrijfsnaam: string;
    email: string;
  };
  inputs: CalculatorInputs;
  resultaten: Resultaten;
  createdAt: Date;
}

export function CalculatorPDF({ lead, inputs, resultaten, createdAt }: CalculatorPDFProps) {
  const dagenLabel = inputs.dagenPerWeek.map((d) => dagen[d]).join(", ");
  const dateStr = new Date(createdAt).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>TopTalent Jobs</Text>
          <Text style={styles.tagline}>Horecapersoneel dat past</Text>
          <Text style={styles.title}>Kostenoverzicht Horecapersoneel</Text>
          <Text style={styles.subtitle}>
            Opgesteld voor {lead.bedrijfsnaam} · {dateStr}
          </Text>
        </View>

        {/* Input Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uw ingevoerde gegevens</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Functie:</Text>
              <Text style={styles.summaryValue}>{functieLabels[inputs.functie]}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Aantal medewerkers:</Text>
              <Text style={styles.summaryValue}>{inputs.aantalMedewerkers} per dienst</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ervaringsniveau:</Text>
              <Text style={styles.summaryValue}>{ervaringLabels[inputs.ervaring]}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Uren per dienst:</Text>
              <Text style={styles.summaryValue}>{inputs.urenPerDienst} uur</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dagen per week:</Text>
              <Text style={styles.summaryValue}>{inputs.dagenPerWeek.length} ({dagenLabel})</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type inzet:</Text>
              <Text style={styles.summaryValue}>
                {inputs.inzetType === "regulier" ? "Regulier" : "Spoed (+15%)"}
              </Text>
            </View>
          </View>
        </View>

        {/* Results Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kostenvergelijking</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colType]}>Type</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>Per uur (excl. btw)</Text>
              <Text style={[styles.tableHeaderCell, styles.colShift]}>Per dienst (excl. btw)</Text>
              <Text style={[styles.tableHeaderCell, styles.colWeek]}>Per week (excl. btw)</Text>
              <Text style={[styles.tableHeaderCell, styles.colMonth]}>Per maand (excl. btw)</Text>
            </View>

            {/* Rows */}
            {inputs.vergelijkingen.map((type, index) => {
              const result = resultaten[type];
              if (!result) return null;

              return (
                <View
                  key={type}
                  style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={[styles.tableCell, styles.colType]}>
                    {vergelijkingLabels[type]}
                  </Text>
                  <Text style={[styles.tableCell, styles.colRate]}>
                    {formatCurrencyDecimal(result.uurtarief)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colShift]}>
                    {formatCurrency(result.perDienst)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colWeek]}>
                    {formatCurrency(result.perWeek)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colMonth, styles.tableCellHighlight]}>
                    {formatCurrency(result.perMaand)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.disclaimer}>
            * Alle bedragen zijn exclusief BTW. Berekening op basis van gemiddelde tarieven 2024/2025. Exacte kosten kunnen afwijken per situatie.
          </Text>
        </View>

        {/* Pros/Cons */}
        <View style={styles.prosConsSection}>
          <Text style={styles.prosConsTitle}>Wat zit er in deze tarieven?</Text>
          <View style={styles.prosConsGrid}>
            {/* Vast */}
            <View style={styles.prosConsBox}>
              <Text style={styles.prosConsBoxTitle}>Vast personeel</Text>
              <View style={styles.prosItem}>
                <Text style={styles.consIcon}>+</Text>
                <Text style={styles.prosText}>Werving & selectie</Text>
              </View>
              <View style={styles.prosItem}>
                <Text style={styles.consIcon}>+</Text>
                <Text style={styles.prosText}>Administratie & salarisverwerking</Text>
              </View>
              <View style={styles.prosItem}>
                <Text style={styles.consIcon}>+</Text>
                <Text style={styles.prosText}>Ziekteverzuim & vervanging</Text>
              </View>
            </View>

            {/* Uitzend */}
            <View style={styles.prosConsBox}>
              <Text style={styles.prosConsBoxTitle}>Uitzendkracht</Text>
              <View style={styles.prosItem}>
                <Text style={styles.prosIcon}>✓</Text>
                <Text style={styles.prosText}>Werving & selectie inclusief</Text>
              </View>
              <View style={styles.prosItem}>
                <Text style={styles.prosIcon}>✓</Text>
                <Text style={styles.prosText}>Vervanging bij uitval</Text>
              </View>
              <View style={styles.prosItem}>
                <Text style={styles.prosIcon}>✓</Text>
                <Text style={styles.prosText}>Volledige flexibiliteit</Text>
              </View>
            </View>

            {/* ZZP */}
            <View style={styles.prosConsBox}>
              <Text style={styles.prosConsBoxTitle}>ZZP'er</Text>
              <View style={styles.prosItem}>
                <Text style={styles.consIcon}>+</Text>
                <Text style={styles.prosText}>Werving zelf regelen</Text>
              </View>
              <View style={styles.prosItem}>
                <Text style={styles.consIcon}>−</Text>
                <Text style={styles.prosText}>Geen garanties bij uitval</Text>
              </View>
              <View style={styles.prosItem}>
                <Text style={styles.consIcon}>−</Text>
                <Text style={styles.prosText}>Schijnzelfstandigheid risico</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Tip: Combineer vast en flex</Text>
          <Text style={styles.tipText}>
            De meest succesvolle horecabedrijven werken met een vaste kern voor continuïteit,
            aangevuld met flexibele uitzendkrachten voor pieken en uitval. Zo houdt u grip op
            kosten én kwaliteit.
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Persoonlijk advies nodig?</Text>
          <Text style={styles.ctaText}>
            Wij denken graag mee over de optimale personeelsmix voor uw zaak.
          </Text>
          <View style={styles.ctaContact}>
            <Text style={styles.ctaContactItem}>toptalentjobs.nl/contact</Text>
            <Text style={styles.ctaContactItem}>+31 6 49 71 37 66</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Opgesteld voor {lead.naam} ({lead.email})
          </Text>
          <Text style={styles.footerBrand}>TopTalent Jobs · toptalentjobs.nl</Text>
        </View>
      </Page>
    </Document>
  );
}

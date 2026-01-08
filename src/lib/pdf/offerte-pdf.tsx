import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { basisTarieven, ervaringsMultiplier } from "@/lib/calculator/tarieven";

// ============================================================================
// Types
// ============================================================================

interface OfferteData {
  // Klantgegevens
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  locatie: string;

  // Personeelsbehoefte
  typePersoneel: string[];
  aantalPersonen: string;
  contractType: string[];
  gewenstUurtarief?: number;

  // Planning
  startDatum: string;
  eindDatum?: string;
  werkdagen: string[];
  werktijden: string;

  // Meta
  offerteNummer: string;
  offerteDatum: Date;
  geldigTot: Date;
}

// ============================================================================
// TopTalent Jobs Brand Colors
// ============================================================================

const colors = {
  primary: "#F27501",      // TopTalent Oranje
  primaryDark: "#d96800",  // Donker oranje
  primaryLight: "#FFF7ED", // Licht oranje achtergrond
  dark: "#333333",         // Donkergrijs (logo)
  text: "#4A4A4A",         // Tekst grijs
  textLight: "#666666",    // Licht tekst grijs
  border: "#E5E5E5",       // Border grijs
  background: "#FAFAFA",   // Achtergrond grijs
  white: "#FFFFFF",
};

// ============================================================================
// Styles - TopTalent Jobs Huisstijl
// ============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: colors.white,
    position: "relative",
  },
  // Header met oranje balk
  headerBar: {
    backgroundColor: colors.primary,
    height: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "25 40",
    paddingTop: 20,
  },
  logo: {
    width: 140,
    height: 70,
  },
  headerRight: {
    textAlign: "right",
    paddingTop: 10,
  },
  companyInfo: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  // Content
  content: {
    padding: "0 40",
  },
  // Offerte titel sectie
  titleSection: {
    marginBottom: 25,
    marginTop: 10,
  },
  offerteLabel: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  // Meta info badges
  metaContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
  },
  metaBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: "12 18",
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.dark,
  },
  // Sections
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionIconText: {
    fontSize: 12,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.dark,
  },
  sectionContent: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 18,
  },
  // Info rows
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    width: "35%",
    fontSize: 10,
    color: colors.textLight,
  },
  infoValue: {
    width: "65%",
    fontSize: 10,
    color: colors.dark,
    fontWeight: "bold",
  },
  // Tarieven tabel
  table: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    padding: 12,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 10,
    color: colors.dark,
  },
  col1: { width: "30%" },
  col2: { width: "25%" },
  col3: { width: "20%" },
  col4: { width: "25%", textAlign: "right" },
  // Totaal row
  totalRow: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: colors.primaryLight,
  },
  totalLabel: {
    width: "75%",
    fontSize: 12,
    fontWeight: "bold",
    color: colors.dark,
  },
  totalValue: {
    width: "25%",
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "right",
  },
  // Voorwaarden box
  conditionsBox: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  conditionsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  conditionsList: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.7,
  },
  // CTA Box
  ctaBox: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 20,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaText: {
    color: colors.white,
    fontSize: 11,
    flex: 1,
  },
  ctaTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  ctaPhone: {
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: "10 20",
  },
  ctaPhoneText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerBar: {
    backgroundColor: colors.dark,
    padding: "15 40",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#999999",
  },
  footerHighlight: {
    color: colors.primary,
  },
  // Decorative elements
  accentLine: {
    height: 3,
    backgroundColor: colors.primary,
    width: 50,
    marginTop: 5,
    borderRadius: 2,
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

const contractTypeLabels: Record<string, string> = {
  zzp: "ZZP'er",
  loondienst: "Loondienst",
  uitzendkracht: "Uitzendkracht",
};

const functieMapping: Record<string, keyof typeof basisTarieven> = {
  "Barista": "bar",
  "Bartender": "bar",
  "Ober/Serveerster": "bediening",
  "Gastheer/Gastvrouw": "bediening",
  "Runner": "bediening",
  "Evenement medewerker": "bediening",
  "Kok": "keuken",
  "Sous-chef": "keuken",
  "Afwasser": "afwas",
};

const contractToTariefType: Record<string, "vast" | "uitzend" | "zzp"> = {
  loondienst: "vast",
  uitzendkracht: "uitzend",
  zzp: "zzp",
};

function getTarief(personeel: string, contractType: string): number {
  const functie = functieMapping[personeel] || "bediening";
  const tariefType = contractToTariefType[contractType] || "uitzend";
  return basisTarieven[functie][tariefType] * ervaringsMultiplier.ervaren;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseAantal(aantalString: string): number {
  if (aantalString === "10+") return 10;
  if (aantalString.includes("-")) {
    const parts = aantalString.split("-");
    return parseInt(parts[1]) || parseInt(parts[0]) || 1;
  }
  return parseInt(aantalString) || 1;
}

// ============================================================================
// PDF Component - TopTalent Jobs Huisstijl
// ============================================================================

export function OffertePDF({ data }: { data: OfferteData }) {
  const aantal = parseAantal(data.aantalPersonen);
  const primaryContract = data.contractType[0] || "uitzendkracht";

  const tariefItems = data.typePersoneel.map((personeel) => {
    const tarief = data.gewenstUurtarief || getTarief(personeel, primaryContract);
    return {
      personeel,
      contractType: contractTypeLabels[primaryContract] || primaryContract,
      uurtarief: tarief,
      geschatteKosten: tarief * 8 * aantal,
    };
  });

  const totaal = tariefItems.reduce((sum, item) => sum + item.geschatteKosten, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header oranje balk */}
        <View style={styles.headerBar} />

        {/* Header content */}
        <View style={styles.headerContent}>
          <Image
            src="https://www.toptalentjobs.nl/logo.png"
            style={styles.logo}
          />
          <View style={styles.headerRight}>
            <Text style={styles.companyInfo}>TopTalent Jobs</Text>
            <Text style={styles.companyInfo}>Utrecht</Text>
            <Text style={styles.companyInfo}>KvK: 73401161</Text>
            <Text style={styles.companyInfo}>info@toptalentjobs.nl</Text>
            <Text style={styles.companyInfo}>+31 6 49 71 37 66</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Titel sectie */}
          <View style={styles.titleSection}>
            <Text style={styles.offerteLabel}>Offerte</Text>
            <Text style={styles.title}>Personeelsvoorstel</Text>
            <Text style={styles.subtitle}>voor {data.bedrijfsnaam}</Text>
            <View style={styles.accentLine} />
          </View>

          {/* Meta badges */}
          <View style={styles.metaContainer}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Offertenummer</Text>
              <Text style={styles.metaValue}>{data.offerteNummer}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Datum</Text>
              <Text style={styles.metaValue}>{formatDate(data.offerteDatum)}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Geldig tot</Text>
              <Text style={styles.metaValue}>{formatDate(data.geldigTot)}</Text>
            </View>
          </View>

          {/* Klantgegevens */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>●</Text>
              </View>
              <Text style={styles.sectionTitle}>Klantgegevens</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bedrijfsnaam</Text>
                <Text style={styles.infoValue}>{data.bedrijfsnaam}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contactpersoon</Text>
                <Text style={styles.infoValue}>{data.contactpersoon}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{data.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefoon</Text>
                <Text style={styles.infoValue}>{data.telefoon}</Text>
              </View>
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.infoLabel}>Locatie</Text>
                <Text style={styles.infoValue}>{data.locatie}</Text>
              </View>
            </View>
          </View>

          {/* Personeelsbehoefte */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>●</Text>
              </View>
              <Text style={styles.sectionTitle}>Personeelsbehoefte</Text>
            </View>
            <View style={styles.sectionContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type personeel</Text>
                <Text style={styles.infoValue}>{data.typePersoneel.join(", ")}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Aantal personen</Text>
                <Text style={styles.infoValue}>{data.aantalPersonen}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contractvorm</Text>
                <Text style={styles.infoValue}>
                  {data.contractType.map(ct => contractTypeLabels[ct] || ct).join(", ")}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Werkdagen</Text>
                <Text style={styles.infoValue}>{data.werkdagen.join(", ")}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Werktijden</Text>
                <Text style={styles.infoValue}>{data.werktijden}</Text>
              </View>
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.infoLabel}>Startdatum</Text>
                <Text style={styles.infoValue}>{data.startDatum}</Text>
              </View>
            </View>
          </View>

          {/* Kostenvoorstel */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Text style={styles.sectionIconText}>●</Text>
              </View>
              <Text style={styles.sectionTitle}>Kostenvoorstel</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.col1]}>Functie</Text>
                <Text style={[styles.tableHeaderCell, styles.col2]}>Contractvorm</Text>
                <Text style={[styles.tableHeaderCell, styles.col3]}>Uurtarief</Text>
                <Text style={[styles.tableHeaderCell, styles.col4]}>Per dag*</Text>
              </View>
              {tariefItems.map((item, index) => (
                <View
                  key={index}
                  style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCell, styles.col1]}>{item.personeel}</Text>
                  <Text style={[styles.tableCell, styles.col2]}>{item.contractType}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>
                    {formatCurrency(item.uurtarief)}
                  </Text>
                  <Text style={[styles.tableCell, styles.col4]}>
                    {formatCurrency(item.geschatteKosten)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Totaal per dag ({aantal} {aantal === 1 ? "persoon" : "personen"} x 8 uur)
                </Text>
                <Text style={styles.totalValue}>{formatCurrency(totaal)}</Text>
              </View>
            </View>
          </View>

          {/* Voorwaarden */}
          <View style={styles.conditionsBox}>
            <Text style={styles.conditionsTitle}>Voorwaarden</Text>
            <Text style={styles.conditionsList}>
              • Tarieven zijn exclusief BTW{"\n"}
              • Minimale afname: 4 uur per dienst{"\n"}
              • Annulering binnen 24 uur: 50% van het tarief{"\n"}
              • Facturatie vindt plaats na afloop van de werkzaamheden{"\n"}
              • Betaaltermijn: 14 dagen na factuurdatum{"\n"}
              • Op al onze diensten zijn onze algemene voorwaarden van toepassing
            </Text>
          </View>

          {/* CTA Box */}
          <View style={styles.ctaBox}>
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Vragen over deze offerte?</Text>
              <Text>Neem gerust contact met ons op. We helpen u graag!</Text>
            </View>
            <View style={styles.ctaPhone}>
              <Text style={styles.ctaPhoneText}>+31 6 49 71 37 66</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBar}>
            <Text style={styles.footerText}>
              <Text style={styles.footerHighlight}>TopTalent Jobs</Text> | Utrecht | KvK: 73401161
            </Text>
            <Text style={styles.footerText}>
              info@toptalentjobs.nl | www.toptalentjobs.nl
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

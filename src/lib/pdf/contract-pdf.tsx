import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { TemplateSectie } from "@/types/contracten";

// ============================================================================
// Types
// ============================================================================

interface ContractPDFData {
  // Contract info
  contractNummer: string;
  titel: string;
  type: string;
  datum: Date;

  // Medewerker
  medewerkerNaam: string;
  medewerkerGeboortedatum?: string;
  medewerkerAdres?: string;

  // Opdrachtgever
  klantNaam?: string;
  werklocatie?: string;

  // Contract details
  functie?: string;
  startdatum?: string;
  einddatum?: string;
  urenPerWeek?: number;
  uurtarief?: number;

  // Template secties (ingevuld met variabelen)
  secties: TemplateSectie[];

  // Handtekeningen
  handtekeningMedewerker?: string; // Base64 PNG
  handtekeningAdmin?: string; // Base64 PNG
  getekendMedewerkerAt?: string;
  getekendAdminAt?: string;
  medewerkerNaamOndertekening?: string;
  adminNaamOndertekening?: string;
}

// ============================================================================
// TopTalent Jobs Brand Colors
// ============================================================================

const colors = {
  primary: "#F27501",
  primaryDark: "#d96800",
  primaryLight: "#FFF7ED",
  dark: "#333333",
  text: "#4A4A4A",
  textLight: "#666666",
  border: "#E5E5E5",
  background: "#FAFAFA",
  white: "#FFFFFF",
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: colors.white,
    position: "relative",
    paddingBottom: 60,
  },
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
  content: {
    padding: "0 40",
  },
  // Titel
  titleSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  contractLabel: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 5,
  },
  accentLine: {
    height: 3,
    backgroundColor: colors.primary,
    width: 50,
    marginTop: 5,
    borderRadius: 2,
  },
  // Meta badges
  metaContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 25,
  },
  metaBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: "10 15",
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.dark,
  },
  // Secties
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionText: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.6,
  },
  // Handtekening blok
  signatureContainer: {
    flexDirection: "row",
    gap: 30,
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 9,
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  signatureImage: {
    width: 180,
    height: 80,
    marginBottom: 6,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.dark,
    width: 200,
    marginBottom: 6,
    height: 80,
  },
  signatureName: {
    fontSize: 10,
    color: colors.dark,
    fontWeight: "bold",
  },
  signatureDate: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 3,
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
    padding: "12 40",
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
  pageNumber: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 5,
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateString(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return formatDate(date);
}

function replaceVariabelen(tekst: string, data: ContractPDFData): string {
  return tekst
    .replace(/\{\{medewerker_naam\}\}/g, data.medewerkerNaam)
    .replace(/\{\{geboortedatum\}\}/g, data.medewerkerGeboortedatum ? formatDateString(data.medewerkerGeboortedatum) : "___________")
    .replace(/\{\{adres\}\}/g, data.medewerkerAdres || "___________")
    .replace(/\{\{functie\}\}/g, data.functie || "___________")
    .replace(/\{\{klant_naam\}\}/g, data.klantNaam || "___________")
    .replace(/\{\{werklocatie\}\}/g, data.werklocatie || "___________")
    .replace(/\{\{startdatum\}\}/g, data.startdatum ? formatDateString(data.startdatum) : "___________")
    .replace(/\{\{einddatum\}\}/g, data.einddatum ? formatDateString(data.einddatum) : "___________")
    .replace(/\{\{uren_per_week\}\}/g, data.urenPerWeek?.toString() || "___________")
    .replace(/\{\{uurtarief\}\}/g, data.uurtarief?.toFixed(2) || "___________");
}

// ============================================================================
// Contract PDF Component
// ============================================================================

export function ContractPDF({ data }: { data: ContractPDFData }) {
  const sortedSecties = [...data.secties].sort((a, b) => a.volgorde - b.volgorde);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar} />

        <View style={styles.headerContent}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src="https://www.toptalentjobs.nl/logo.png"
            style={styles.logo}
          />
          <View style={styles.headerRight}>
            <Text style={styles.companyInfo}>TopTalent Jobs B.V.</Text>
            <Text style={styles.companyInfo}>Utrecht</Text>
            <Text style={styles.companyInfo}>KvK: 73401161</Text>
            <Text style={styles.companyInfo}>info@toptalentjobs.nl</Text>
            <Text style={styles.companyInfo}>+31 6 49 71 37 66</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Titel */}
          <View style={styles.titleSection}>
            <Text style={styles.contractLabel}>Contract</Text>
            <Text style={styles.title}>{data.titel}</Text>
            <View style={styles.accentLine} />
          </View>

          {/* Meta */}
          <View style={styles.metaContainer}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Contractnummer</Text>
              <Text style={styles.metaValue}>{data.contractNummer}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Datum</Text>
              <Text style={styles.metaValue}>{formatDate(data.datum)}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>Type</Text>
              <Text style={styles.metaValue}>{data.type}</Text>
            </View>
          </View>

          {/* Contract Secties */}
          {sortedSecties.map((sectie, index) => (
            <View key={index} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>{sectie.titel}</Text>
              <Text style={styles.sectionText}>
                {replaceVariabelen(sectie.tekst, data)}
              </Text>
            </View>
          ))}

          {/* Handtekeningen */}
          <View style={styles.signatureContainer} wrap={false}>
            {/* Admin / Werkgever */}
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>De werkgever</Text>
              {data.handtekeningAdmin ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src={data.handtekeningAdmin}
                    style={styles.signatureImage}
                  />
                </>
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={styles.signatureName}>
                {data.adminNaamOndertekening || "TopTalent Jobs B.V."}
              </Text>
              {data.getekendAdminAt && (
                <Text style={styles.signatureDate}>
                  Getekend op: {formatDateString(data.getekendAdminAt.split("T")[0])}
                </Text>
              )}
            </View>

            {/* Medewerker */}
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>De werknemer</Text>
              {data.handtekeningMedewerker ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src={data.handtekeningMedewerker}
                    style={styles.signatureImage}
                  />
                </>
              ) : (
                <View style={styles.signatureLine} />
              )}
              <Text style={styles.signatureName}>
                {data.medewerkerNaamOndertekening || data.medewerkerNaam}
              </Text>
              {data.getekendMedewerkerAt && (
                <Text style={styles.signatureDate}>
                  Getekend op: {formatDateString(data.getekendMedewerkerAt.split("T")[0])}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerBar}>
            <Text style={styles.footerText}>
              <Text style={styles.footerHighlight}>TopTalent Jobs B.V.</Text> | Utrecht | KvK: 73401161
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

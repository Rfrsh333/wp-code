import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#F27501",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F27501",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    fontSize: 11,
    color: "#666",
  },
  value: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
  },
  highlight: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F27501",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 10,
    color: "#999",
  },
});

interface MetricsReportProps {
  metrics: any;
}

export const MetricsReport = ({ metrics }: MetricsReportProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const reportDate = new Date().toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TopTalent Business Metrics</Text>
          <Text style={styles.subtitle}>Gegenereerd op {reportDate}</Text>
          {metrics.period && (
            <Text style={styles.subtitle}>
              Periode: {new Date(metrics.period.from).toLocaleDateString("nl-NL")} -{" "}
              {new Date(metrics.period.to).toLocaleDateString("nl-NL")}
            </Text>
          )}
        </View>

        {/* Pipeline Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Pipeline Overzicht</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Totaal Leads</Text>
            <Text style={styles.highlight}>{metrics.pipeline.total}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Conversie Rate</Text>
            <Text style={styles.value}>{metrics.pipeline.conversionRate}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nieuwe Leads (Periode)</Text>
            <Text style={styles.value}>{metrics.pipeline.recentLeads}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gemiddelde Engagement</Text>
            <Text style={styles.value}>{metrics.pipeline.avgEngagement}/100</Text>
          </View>
        </View>

        {/* Pipeline Stages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pipeline per Stage</Text>
          {Object.entries(metrics.pipeline.byStage).map(([stage, count]: [string, any]) => (
            <View key={stage} style={styles.row}>
              <Text style={styles.label}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</Text>
              <Text style={styles.value}>{count}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Financieel</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Omzet Deze Maand</Text>
            <Text style={styles.highlight}>{formatCurrency(metrics.revenue.thisMonth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Omzet Vorige Maand</Text>
            <Text style={styles.value}>{formatCurrency(metrics.revenue.lastMonth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Trend</Text>
            <Text style={styles.value}>
              {metrics.revenue.trend >= 0 ? "+" : ""}
              {metrics.revenue.trend}%
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Totaal Omzet</Text>
            <Text style={styles.value}>{formatCurrency(metrics.revenue.total)}</Text>
          </View>
        </View>

        {/* Operations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Operationeel</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Actieve Diensten</Text>
            <Text style={styles.value}>{metrics.operations.activeDiensten}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Voltooide Diensten</Text>
            <Text style={styles.value}>{metrics.operations.completedDiensten}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Bezettingsgraad</Text>
            <Text style={styles.value}>{metrics.operations.fillRate}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Actieve Medewerkers</Text>
            <Text style={styles.value}>{metrics.operations.activeMedewerkers}</Text>
          </View>
        </View>

        {/* Engagement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Engagement</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Totaal Contactmomenten</Text>
            <Text style={styles.value}>{metrics.engagement.totalContacts}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Positieve Reacties</Text>
            <Text style={styles.value}>{metrics.engagement.positiveRate}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Top Kanaal</Text>
            <Text style={styles.value}>{metrics.engagement.topChannel || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email Open Rate</Text>
            <Text style={styles.value}>{metrics.engagement.emailOpenRate}%</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          TopTalent Jobs • Dit rapport is automatisch gegenereerd
        </Text>
      </Page>
    </Document>
  );
};

// CSV Export Utilities

export function downloadCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function metricsToCSV(metrics: any) {
  const rows = [
    // Pipeline data
    ...Object.entries(metrics.pipeline.byStage).map(([stage, count]) => ({
      Category: "Pipeline",
      Metric: stage,
      Value: count,
      Unit: "leads"
    })),

    // Revenue data
    { Category: "Revenue", Metric: "Deze Maand", Value: metrics.revenue.thisMonth, Unit: "EUR" },
    { Category: "Revenue", Metric: "Vorige Maand", Value: metrics.revenue.lastMonth, Unit: "EUR" },
    { Category: "Revenue", Metric: "Trend", Value: metrics.revenue.trend, Unit: "%" },
    { Category: "Revenue", Metric: "Totaal", Value: metrics.revenue.total, Unit: "EUR" },

    // Operations data
    { Category: "Operations", Metric: "Actieve Diensten", Value: metrics.operations.activeDiensten, Unit: "diensten" },
    { Category: "Operations", Metric: "Voltooide Diensten", Value: metrics.operations.completedDiensten, Unit: "diensten" },
    { Category: "Operations", Metric: "Fill Rate", Value: metrics.operations.fillRate, Unit: "%" },
    { Category: "Operations", Metric: "Actieve Medewerkers", Value: metrics.operations.activeMedewerkers, Unit: "mensen" },

    // Engagement data
    { Category: "Engagement", Metric: "Totaal Contactmomenten", Value: metrics.engagement.totalContacts, Unit: "contacten" },
    { Category: "Engagement", Metric: "Positieve Rate", Value: metrics.engagement.positiveRate, Unit: "%" },
    { Category: "Engagement", Metric: "Top Kanaal", Value: metrics.engagement.topChannel, Unit: "" },
    { Category: "Engagement", Metric: "Avg Response Time", Value: metrics.engagement.avgResponseTime, Unit: "uur" },
    { Category: "Engagement", Metric: "Email Open Rate", Value: metrics.engagement.emailOpenRate, Unit: "%" },
  ];

  return rows;
}

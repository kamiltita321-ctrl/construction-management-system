"use client";

import { useState } from "react";
import ReportsDashboard from "./ReportsDashboard";
import SummaryDashboard from "./SummaryDashboard";

interface ReportsTabsLayoutProps {
  reportsDashboard: React.ReactNode;
  summaryDashboard: React.ReactNode;
  isSiteEngineer?: boolean;
}

export default function ReportsTabsLayout({
  reportsDashboard,
  summaryDashboard,
  isSiteEngineer = false,
}: ReportsTabsLayoutProps) {
  const [activeTab, setActiveTab] = useState<"logs" | "summaries">("logs");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Upper Tab Switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "24px" }}>
        <button
          onClick={() => setActiveTab("logs")}
          style={{
            padding: "12px 4px",
            border: "none",
            borderBottom: activeTab === "logs" ? "2px solid var(--accent)" : "none",
            background: "none",
            color: activeTab === "logs" ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          📝 Daily Site Logs
        </button>
        {!isSiteEngineer && (
          <button
            onClick={() => setActiveTab("summaries")}
            style={{
              padding: "12px 4px",
              border: "none",
              borderBottom: activeTab === "summaries" ? "2px solid var(--accent)" : "none",
              background: "none",
              color: activeTab === "summaries" ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            📋 Weekly / Monthly Summaries
          </button>
        )}
      </div>

      {/* Render selected view */}
      {activeTab === "logs" || isSiteEngineer ? reportsDashboard : summaryDashboard}
    </div>
  );
}

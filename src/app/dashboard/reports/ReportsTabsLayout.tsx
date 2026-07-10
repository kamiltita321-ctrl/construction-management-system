"use client";

import { useState } from "react";

interface ReportsTabsLayoutProps {
  reportsDashboard: React.ReactNode;
  summaryDashboard: React.ReactNode;
  financialDashboard?: React.ReactNode | null;
  isSiteEngineer?: boolean;
}

export default function ReportsTabsLayout({
  reportsDashboard,
  summaryDashboard,
  financialDashboard,
  isSiteEngineer = false,
}: ReportsTabsLayoutProps) {
  const [activeTab, setActiveTab] = useState<"logs" | "summaries" | "financial">("logs");

  const tabStyle = (id: string) => ({
    padding: "12px 4px",
    border: "none",
    borderBottom: activeTab === id ? "2px solid var(--accent)" : "2px solid transparent",
    background: "none",
    color: activeTab === id ? "var(--accent)" : "var(--text-secondary)",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
    transition: "color 0.15s, border-color 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Upper Tab Switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "24px" }}>
        <button onClick={() => setActiveTab("logs")} style={tabStyle("logs")}>
          📝 Daily Site Logs
        </button>
        {!isSiteEngineer && (
          <button onClick={() => setActiveTab("summaries")} style={tabStyle("summaries")}>
            📋 Weekly / Monthly Summaries
          </button>
        )}
        {!isSiteEngineer && financialDashboard && (
          <button onClick={() => setActiveTab("financial")} style={tabStyle("financial")}>
            💰 Financial Dashboard
          </button>
        )}
      </div>

      {/* Render selected view */}
      {activeTab === "logs" || isSiteEngineer ? (
        reportsDashboard
      ) : activeTab === "financial" && financialDashboard ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>Financial Dashboard</h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Aggregate P&L analysis from Office Engineer daily cost and profit entries.
            </p>
          </div>
          {financialDashboard}
        </div>
      ) : (
        summaryDashboard
      )}
    </div>
  );
}

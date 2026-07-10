"use client";

interface FinancialSummaryProps {
  reports: Array<{
    reportDate: string;
    dailyCost: number | null;
    dailyProfit: number | null;
    project: { id: string; name: string; code: string };
  }>;
  role: string;
}

export default function FinancialDashboard({ reports, role }: FinancialSummaryProps) {
  const reportsWithFinance = reports.filter((r) => r.dailyCost !== null || r.dailyProfit !== null);

  // Aggregate totals
  const totalCost = reportsWithFinance.reduce((s, r) => s + (r.dailyCost || 0), 0);
  const totalRevenue = reportsWithFinance.reduce((s, r) => s + (r.dailyProfit || 0), 0);
  const netPL = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((netPL / totalRevenue) * 100).toFixed(1) : "0.0";

  // Group by project
  const byProject: Record<string, { name: string; code: string; cost: number; revenue: number; days: number }> = {};
  for (const r of reportsWithFinance) {
    if (!byProject[r.project.id]) {
      byProject[r.project.id] = { name: r.project.name, code: r.project.code, cost: 0, revenue: 0, days: 0 };
    }
    byProject[r.project.id].cost += r.dailyCost || 0;
    byProject[r.project.id].revenue += r.dailyProfit || 0;
    byProject[r.project.id].days += 1;
  }

  const fmt = (v: number) =>
    v.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

  if (reportsWithFinance.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>💰</div>
        <h4 style={{ fontWeight: 700, fontSize: "16px" }}>No Financial Data Yet</h4>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
          Office Engineers must encode daily cost & profit in their daily report submissions for this dashboard to populate.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {[
          { label: "Total Cost Incurred", value: fmt(totalCost), color: "var(--error)", icon: "📉", sub: `${reportsWithFinance.length} days logged` },
          { label: "Total Revenue / Billing", value: fmt(totalRevenue), color: "var(--success)", icon: "📈", sub: "Gross earnings" },
          { label: "Net P&L", value: fmt(netPL), color: netPL >= 0 ? "var(--success)" : "var(--error)", icon: netPL >= 0 ? "✅" : "🔴", sub: `${margin}% margin` },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel" style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{kpi.icon}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{kpi.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: kpi.color, marginTop: "4px" }}>{kpi.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Project Breakdown */}
      <section className="glass-panel" style={{ padding: "24px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>📊 Financial Breakdown by Project</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Object.entries(byProject).map(([id, proj]) => {
            const projPL = proj.revenue - proj.cost;
            const projMargin = proj.revenue > 0 ? ((projPL / proj.revenue) * 100).toFixed(1) : "0.0";
            return (
              <div key={id} style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>{proj.code}</span>
                    <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "2px" }}>{proj.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{proj.days} day(s) with financial data</div>
                  </div>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: projPL >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    color: projPL >= 0 ? "var(--success)" : "var(--error)",
                  }}>
                    {projPL >= 0 ? "✅ Profitable" : "🔴 Loss"} · {projMargin}%
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Cost</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--error)" }}>{fmt(proj.cost)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Revenue</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--success)" }}>{fmt(proj.revenue)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Net P&L</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: projPL >= 0 ? "var(--success)" : "var(--error)" }}>{fmt(projPL)}</div>
                  </div>
                </div>
                {/* P&L Progress bar */}
                {proj.revenue > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      <span>Cost coverage ratio</span>
                      <span>{Math.min(100, Math.round((proj.cost / proj.revenue) * 100))}%</span>
                    </div>
                    <div style={{ height: "4px", backgroundColor: "var(--border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (proj.cost / proj.revenue) * 100)}%`, backgroundColor: proj.cost > proj.revenue ? "var(--error)" : "var(--success)", transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-Day Log */}
      <section className="glass-panel" style={{ padding: "24px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>📅 Daily Financial Log</h4>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["Date", "Project", "Daily Cost", "Daily Revenue", "Net P&L"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", backgroundColor: "var(--bg-base)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportsWithFinance.map((r, i) => {
                const pl = (r.dailyProfit || 0) - (r.dailyCost || 0);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{new Date(r.reportDate).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{r.project.code} – {r.project.name}</td>
                    <td style={{ padding: "10px 12px", color: "var(--error)", fontWeight: 600 }}>{fmt(r.dailyCost || 0)}</td>
                    <td style={{ padding: "10px 12px", color: "var(--success)", fontWeight: 600 }}>{fmt(r.dailyProfit || 0)}</td>
                    <td style={{ padding: "10px 12px", color: pl >= 0 ? "var(--success)" : "var(--error)", fontWeight: 700 }}>{fmt(pl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ProjectData {
  name: string;
  budget: number;
  status: string;
  progress?: number;
}

interface ActivityItem {
  id: string;
  description: string;
  date: string;
}

interface OverviewDashboardProps {
  stats: {
    activeProjects: number;
    pendingTasks: number;
    lowStockMaterialsCount: number;
    pendingChangeOrdersCount: number;
    totalBudget: number;
    avgProgress: number;
  };
  charts: {
    projectsData: ProjectData[];
    recentActivities: ActivityItem[];
  };
  currentUser: {
    role: string;
    firstName: string;
  };
}

const ROLE_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  SYSTEM_ADMIN:          { label: "System Administrator", color: "#ef4444", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
  GENERAL_MANAGER:       { label: "General Manager",       color: "#a855f7", gradient: "linear-gradient(135deg, #a855f7, #7c3aed)" },
  DEPUTY_GENERAL_MANAGER:{ label: "Deputy General Manager",color: "#a855f7", gradient: "linear-gradient(135deg, #a855f7, #7c3aed)" },
  VP_OF_CONSTRUCTION:    { label: "VP of Construction",    color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
  PROJECT_MANAGER:       { label: "Project Manager",       color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  OFFICE_ENGINEER:         { label: "Office Engineer",       color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #059669)" },
  CONSTRUCTION_ENGINEER:   { label: "Construction Engineer", color: "#06b6d4", gradient: "linear-gradient(135deg, #06b6d4, #0891b2)" },
  SITE_ENGINEER:           { label: "Site Engineer",         color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #059669)" },
};

// SVG Donut/Progress chart component
function DonutChart({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border)" strokeWidth={8} />
      <circle
        cx={cx} cy={cy} r={radius} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${strokeDash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px`, fontSize: "14px", fontWeight: 700, fill: "var(--text-primary)" }}
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

// Horizontal bar chart for project budgets
function BudgetBar({ project, maxBudget, index }: { project: ProjectData; maxBudget: number; index: number }) {
  const barPct = maxBudget > 0 ? (project.budget / maxBudget) * 100 : 0;
  const progressPct = project.progress ?? 0;

  const statusColors: Record<string, string> = {
    ACTIVE: "var(--success)",
    PLANNING: "var(--accent)",
    ON_HOLD: "var(--warning)",
    COMPLETED: "var(--text-muted)",
    CANCELLED: "var(--error)",
  };

  return (
    <div
      className="animate-slide-up"
      style={{
        display: "flex", flexDirection: "column", gap: "8px",
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{project.name}</span>
          <span
            style={{
              marginLeft: "8px", fontSize: "10px", fontWeight: 700, padding: "2px 7px",
              borderRadius: "var(--radius-full)", textTransform: "uppercase",
              color: statusColors[project.status] ?? "var(--text-muted)",
              backgroundColor: `${statusColors[project.status] ?? "var(--border)"}22`,
            }}
          >
            {project.status.replace(/_/g, " ")}
          </span>
        </div>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>
          ${project.budget.toLocaleString()}
        </span>
      </div>

      {/* Budget allocation bar */}
      <div style={{ position: "relative", height: "6px", backgroundColor: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            width: `${barPct}%`, height: "100%",
            background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
            borderRadius: "3px", transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Task progress bar */}
      <div style={{ position: "relative", height: "4px", backgroundColor: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
        <div
          style={{
            width: `${progressPct}%`, height: "100%",
            backgroundColor: statusColors[project.status] ?? "var(--success)",
            borderRadius: "2px", transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)" }}>
        <span>Budget allocation</span>
        <span>{progressPct}% task progress</span>
      </div>
    </div>
  );
}

// KPI metric card with animated value
function KpiCard({
  icon, label, value, subtext, color, link, delay = 0
}: {
  icon: string; label: string; value: string | number; subtext?: string;
  color?: string; link?: string; delay?: number;
}) {
  const card = (
    <div
      className="glass-panel-interactive animate-slide-up"
      style={{
        padding: "24px", display: "flex", flexDirection: "column", gap: "12px",
        animationDelay: `${delay}ms`, cursor: link ? "pointer" : "default",
        borderTop: color ? `3px solid ${color}` : undefined,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Background glow */}
      {color && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: "80px", height: "80px",
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <span style={{ fontSize: "26px" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </div>
        <div style={{ fontSize: "30px", fontWeight: 800, color: color ?? "var(--text-primary)", lineHeight: 1.1, marginTop: "4px" }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{subtext}</div>
        )}
      </div>
    </div>
  );

  return link ? <Link href={link} style={{ textDecoration: "none" }}>{card}</Link> : card;
}

// Activity type badge mapping
function getActivityIcon(description: string) {
  if (description.includes("Task")) return "📋";
  if (description.includes("Change Order")) return "💸";
  if (description.includes("Report")) return "📝";
  return "🛠️";
}

export default function OverviewDashboard({ stats, charts, currentUser }: OverviewDashboardProps) {
  const roleConfig = ROLE_CONFIG[currentUser.role] ?? ROLE_CONFIG.OFFICE_ENGINEER;
  const isExecutive = ["SYSTEM_ADMIN", "GENERAL_MANAGER", "DEPUTY_GENERAL_MANAGER", "VP_OF_CONSTRUCTION"].includes(currentUser.role);
  const isPM = currentUser.role === "PROJECT_MANAGER";
  const isSE = currentUser.role === "OFFICE_ENGINEER";

  const maxBudget = Math.max(...charts.projectsData.map(p => p.budget), 1);
  const totalProjectBudget = charts.projectsData.reduce((acc, p) => acc + p.budget, 0);

  const [now] = useState(new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ── Welcome Banner ── */}
      <section
        className="glass-panel animate-fade-in"
        style={{
          padding: "32px 40px",
          background: `linear-gradient(135deg, ${roleConfig.color}11 0%, transparent 60%)`,
          borderTop: `3px solid ${roleConfig.color}`,
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Decorative bg orb */}
        <div style={{
          position: "absolute", right: "-40px", top: "-40px",
          width: "220px", height: "220px", borderRadius: "50%",
          background: `radial-gradient(circle, ${roleConfig.color}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: roleConfig.color, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
              {roleConfig.label} · {now}
            </div>
            <h2 style={{ fontSize: "30px", fontWeight: 800, marginBottom: "10px", letterSpacing: "-0.5px" }}>
              Welcome back, {currentUser.firstName}!
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: "1.6", fontSize: "14px", maxWidth: "600px" }}>
              {isExecutive
                ? "Here is your organisation-wide executive overview. Monitor all projects, budgets, and team performance from a single view."
                : isPM
                ? "Here is your project performance dashboard. Review your assigned projects, track tasks, and manage daily logs."
                : "Here is your daily workspace. Check your assigned tasks, submit site logs, and track upcoming deadlines."}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-block", padding: "10px 18px",
                background: roleConfig.gradient, borderRadius: "var(--radius-md)",
                fontSize: "12px", fontWeight: 700, color: "white",
                textTransform: "uppercase", letterSpacing: "0.5px",
                boxShadow: `0 4px 15px ${roleConfig.color}40`,
              }}
            >
              💼 {roleConfig.label}
            </div>
            {isExecutive && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                Org-wide visibility · All Projects
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── KPI Cards Grid ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>

        <KpiCard
          icon="📁" label="Active Projects" delay={0}
          value={stats.activeProjects}
          subtext={isExecutive ? `${charts.projectsData.length} total projects` : "Assigned to you"}
          color="var(--accent)"
          link="/dashboard/projects"
        />

        <KpiCard
          icon="📋" label={isSE ? "My Open Tasks" : "Pending Tasks"} delay={60}
          value={stats.pendingTasks}
          subtext="Not yet completed"
          color={stats.pendingTasks > 5 ? "var(--warning)" : "var(--success)"}
          link="/dashboard/tasks"
        />

        <KpiCard
          icon="💸" label="Change Orders" delay={120}
          value={stats.pendingChangeOrdersCount}
          subtext="Awaiting approval"
          color={stats.pendingChangeOrdersCount > 0 ? "var(--warning)" : "var(--success)"}
          link="/dashboard/projects"
        />

        <KpiCard
          icon="📦" label="Inventory Status" delay={180}
          value={stats.lowStockMaterialsCount > 0 ? `${stats.lowStockMaterialsCount} Low` : "Healthy"}
          subtext={stats.lowStockMaterialsCount > 0 ? "Materials below threshold" : "All stock levels OK"}
          color={stats.lowStockMaterialsCount > 0 ? "var(--error)" : "var(--success)"}
          link="/dashboard/inventory"
        />

        {(isExecutive || isPM) && (
          <KpiCard
            icon="💰" label="Total Budget" delay={240}
            value={`$${(totalProjectBudget / 1_000_000).toFixed(1)}M`}
            subtext="Across all visible projects"
            color="var(--accent)"
          />
        )}

        <KpiCard
          icon="📈" label="Avg. Task Progress" delay={300}
          value={`${stats.avgProgress}%`}
          subtext="Weighted across all tasks"
          color={stats.avgProgress >= 70 ? "var(--success)" : stats.avgProgress >= 40 ? "var(--warning)" : "var(--error)"}
        />
      </section>

      {/* ── Main Content Grid ── */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* Project Budgets & Progress */}
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Project Budgets &amp; Execution Progress</h4>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                Budget allocation (orange) vs. task completion progress
              </p>
            </div>
            <Link
              href="/dashboard/projects"
              style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
            >
              View All →
            </Link>
          </div>

          {charts.projectsData.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
              No projects registered yet. <Link href="/dashboard/projects" style={{ color: "var(--accent)" }}>Create one →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {charts.projectsData.slice(0, 8).map((project, idx) => (
                <BudgetBar key={idx} project={project} maxBudget={maxBudget} index={idx} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Progress Donut */}
          <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, alignSelf: "flex-start" }}>Overall Completion</h4>
            <DonutChart value={stats.avgProgress} max={100} color="var(--accent)" size={120} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {stats.avgProgress >= 70 ? "🟢 On Track" : stats.avgProgress >= 40 ? "🟡 Moderate Progress" : "🔴 Needs Attention"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Average task progress across {stats.activeProjects} projects
              </div>
            </div>
          </div>

          {/* Status distribution */}
          {charts.projectsData.length > 0 && (
            <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700 }}>Project Status Mix</h4>
              {(["ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED", "CANCELLED"] as const).map(status => {
                const count = charts.projectsData.filter(p => p.status === status).length;
                if (count === 0) return null;
                const pct = Math.round((count / charts.projectsData.length) * 100);
                const colors: Record<string, string> = {
                  ACTIVE: "var(--success)", PLANNING: "var(--accent)", ON_HOLD: "var(--warning)",
                  COMPLETED: "var(--text-muted)", CANCELLED: "var(--error)",
                };
                return (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>{status.replace("_", " ")}</span>
                      <span style={{ color: colors[status], fontWeight: 700 }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: colors[status], borderRadius: "2px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>Quick Actions</h4>
            {[
              { label: "View My Projects", href: "/dashboard/projects", icon: "📁", show: true },
              { label: "Open Task Board", href: "/dashboard/tasks", icon: "📋", show: true },
              { label: "Material Inventory", href: "/dashboard/inventory", icon: "📦", show: !isSE },
              { label: "Reports & Daily Logs", href: "/dashboard/reports", icon: "📝", show: true },
            ].filter(a => a.show).map(action => (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 14px", borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-base)", border: "1px solid var(--border)",
                  fontSize: "13px", fontWeight: 600, color: "var(--text-primary)",
                  textDecoration: "none", transition: "all var(--transition-fast)",
                }}
                className="quick-action-link"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
                <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Activity Log ── */}
      <section className="glass-panel" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Recent Activity Log</h4>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Last 10 workspace events</span>
        </div>

        {charts.recentActivities.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center", padding: "20px" }}>
            No recent activity logged yet.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {charts.recentActivities.map((act, i) => (
              <div
                key={act.id}
                className="animate-slide-up"
                style={{
                  display: "flex", gap: "12px", padding: "12px 16px",
                  backgroundColor: "var(--bg-base)", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span style={{ fontSize: "18px", flexShrink: 0 }}>{getActivityIcon(act.description)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {act.description}
                  </p>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

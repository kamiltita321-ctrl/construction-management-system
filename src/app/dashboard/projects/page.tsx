import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { Role, ProjectStatus } from "@prisma/client";
import Link from "next/link";
import AddProjectForm from "./AddProjectForm";

export default async function ProjectsPage() {
  const session = await requireAuth();
  const { role, userId } = session;

  // 1. Fetch projects based on user permissions
  let projects;
  if (role === Role.OFFICE_ENGINEER) {
    projects = await prisma.project.findMany({
      where: {
        engineers: {
          some: { id: userId },
        },
      },
      include: {
        manager: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { startDate: "desc" },
    });
  } else if (role === Role.PROJECT_MANAGER) {
    projects = await prisma.project.findMany({
      where: { managerId: userId },
      include: {
        manager: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { startDate: "desc" },
    });
  } else {
    // Admins, GMs, DGMs, VPs see all projects
    projects = await prisma.project.findMany({
      include: {
        manager: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { startDate: "desc" },
    });
  }

  // 2. Determine if user can create projects
  const canCreate =
    role === Role.SYSTEM_ADMIN ||
    role === Role.GENERAL_MANAGER ||
    role === Role.DEPUTY_GENERAL_MANAGER ||
    role === Role.VP_OF_CONSTRUCTION;

  // 3. Fetch managers list if authorized to create
  let managers: { id: string; firstName: string; lastName: string; email: string }[] = [];
  if (canCreate) {
    managers = await prisma.user.findMany({
      where: { role: Role.PROJECT_MANAGER, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper to get status color
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return { bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e" };
      case ProjectStatus.PLANNING:
        return { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" };
      case ProjectStatus.ON_HOLD:
        return { bg: "rgba(234, 179, 8, 0.1)", color: "#eab308" };
      case ProjectStatus.COMPLETED:
        return { bg: "rgba(168, 85, 247, 0.1)", color: "#a855f7" };
      default:
        return { bg: "rgba(100, 116, 139, 0.1)", color: "#64748b" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Projects Directory</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Manage construction projects, schedules, budgets, and milestones.
          </p>
        </div>
        {canCreate && <AddProjectForm managers={managers} />}
      </div>

      {projects.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: "48px",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ fontSize: "36px" }}>📁</span>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginTop: "12px" }}>No projects found</h3>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>
            You are not currently assigned to any active project folders.
          </p>
        </div>
      ) : (
        /* Projects Cards Grid */
        <div
          className="animate-slide-up"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {projects.map((p) => {
            const statusStyle = getStatusColor(p.status);
            return (
              <div
                key={p.id}
                className="glass-panel-interactive"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                }}
              >
                {/* Card Top Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(249, 115, 22, 0.08)",
                      color: "var(--accent)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {p.code}
                  </span>
                  <span
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      textTransform: "uppercase",
                    }}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Project Info */}
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", lineClamp: 1 }}>
                  {p.name}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                    marginBottom: "20px",
                    height: "38px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {p.description || "No project description provided."}
                </p>

                {/* Project Details Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Location
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{p.location}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Budget
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
                      {formatCurrency(p.budget)}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Manager
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                      {p.manager.firstName} {p.manager.lastName}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Start Date
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                      {p.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* View Details Link button */}
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="btn btn-secondary"
                  style={{ width: "100%", textAlign: "center", marginTop: "auto" }}
                >
                  Open Project Folder ➔
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

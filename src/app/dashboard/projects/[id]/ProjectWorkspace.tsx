"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MilestonesList from "./MilestonesList";
import ProjectDocuments from "./ProjectDocuments";
import ReportsDashboard from "../../reports/ReportsDashboard";
import SummaryDashboard from "../../reports/SummaryDashboard";
import ScheduleUploader from "./ScheduleUploader";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string | null;
  status: string;
  budget: number;
  category: string;
  lagReason: string | null;
  manager: User;
  engineers: User[];
  materials: Array<{
    id: string;
    allocatedQty: number;
    consumedQty: number;
    material: { id: string; name: string; unit: string; stockCount: number; minStock: number };
  }>;
  documents: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    isCompleted: boolean;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  type: string;
  progress: number;
  projectId: string;
  assigneeId: string | null;
  assignee: { firstName: string; lastName: string } | null;
}

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  estimatedCost: number;
  status: string;
  rejectionReason: string | null;
  projectId: string;
  requester: { firstName: string; lastName: string };
  approver: { firstName: string; lastName: string } | null;
}

interface ProjectNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string; role: string };
}

interface ProjectWorkspaceProps {
  project: Project;
  initialTasks: Task[];
  initialChangeOrders: ChangeOrder[];
  initialReports: any[];
  initialSummaries: any[];
  currentUser: {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ProjectWorkspace({
  project,
  initialTasks,
  initialChangeOrders,
  initialReports,
  initialSummaries,
  currentUser,
}: ProjectWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "crew" | "daily-logs" | "inventory" | "reports" | "documents" | "schedule"
  >("dashboard");

  // Sub-tab within Daily Logs
  const [dailySubTab, setDailySubTab] = useState<
    "qc-log" | "work-orders" | "change-orders" | "notes" | "visitors" | "inspection"
  >("qc-log");

  // Scoped Workspace State
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(initialChangeOrders);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Form Modals / Input State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCOModalOpen, setIsCOModalOpen] = useState(false);
  const [coRejectionModalOpen, setCoRejectionModalOpen] = useState(false);
  const [activeCoId, setActiveCoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Task form fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");

  // Change Order form fields
  const [coTitle, setCoTitle] = useState("");
  const [coDesc, setCoDesc] = useState("");
  const [coCost, setCoCost] = useState("");

  // Note form fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Load Notes when Notes sub-tab is active inside Daily Logs
  useEffect(() => {
    if (activeTab === "daily-logs" && dailySubTab === "notes") {
      setNotesLoading(true);
      fetch(`/api/projects/${project.id}/notes`)
        .then((res) => res.json())
        .then((data) => {
          if (data.notes) setNotes(data.notes);
        })
        .catch((err) => console.error("Error fetching notes:", err))
        .finally(() => setNotesLoading(false));
    }
  }, [activeTab, dailySubTab, project.id]);

  const isOE = currentUser.role === "OFFICE_ENGINEER";
  const isCE = currentUser.role === "CONSTRUCTION_ENGINEER";
  const isPM = currentUser.role === "PROJECT_MANAGER";
  const isHeadOffice =
    currentUser.role === "SYSTEM_ADMIN" ||
    currentUser.role === "GENERAL_MANAGER" ||
    currentUser.role === "DEPUTY_GENERAL_MANAGER" ||
    currentUser.role === "VP_OF_CONSTRUCTION";

  // Work Orders: CE initiates/QCs, PM approves, Head Office oversees
  const canModifyTasks = isHeadOffice || isPM || isCE;

  // Change orders approved by Head Office only
  const canApproveCO = isHeadOffice;

  // Change orders requested by Head Office or PM
  const canRequestCO = isHeadOffice || isPM;

  // Visitors & Inspections states
  interface Visitor {
    id: string;
    visitorName: string;
    organization: string | null;
    purpose: string;
    visitDatetime: string;
    badgeNumber: string | null;
    remarks: string | null;
    escortedBy: { firstName: string; lastName: string } | null;
    loggedBy: { firstName: string; lastName: string };
  }

  interface Inspection {
    id: string;
    inspectionType: string;
    inspectorName: string;
    inspectionDate: string;
    area: string;
    outcome: string;
    followUpDate: string | null;
    findings: string | null;
    conductedBy: { firstName: string; lastName: string };
  }

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorOrg, setVisitorOrg] = useState("");
  const [visitorPurpose, setVisitorPurpose] = useState("Inspection");
  const [visitorDatetime, setVisitorDatetime] = useState("");
  const [visitorBadge, setVisitorBadge] = useState("");
  const [visitorEscortId, setVisitorEscortId] = useState("");
  const [visitorRemarks, setVisitorRemarks] = useState("");

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionType, setInspectionType] = useState("Structural Safety");
  const [inspectorNameField, setInspectorNameField] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionArea, setInspectionArea] = useState("");
  const [inspectionOutcome, setInspectionOutcome] = useState("PASSED");
  const [inspectionFollowUp, setInspectionFollowUp] = useState("");
  const [inspectionFindings, setInspectionFindings] = useState("");

  // Load Visitors & Inspections
  useEffect(() => {
    if (activeTab === "daily-logs") {
      if (dailySubTab === "visitors") {
        setVisitorsLoading(true);
        fetch(`/api/projects/${project.id}/visitors`)
          .then((res) => res.json())
          .then((data) => {
            if (data.visitors) setVisitors(data.visitors);
          })
          .catch((err) => console.error("Error fetching visitors:", err))
          .finally(() => setVisitorsLoading(false));
      } else if (dailySubTab === "inspection") {
        setInspectionsLoading(true);
        fetch(`/api/projects/${project.id}/inspections`)
          .then((res) => res.json())
          .then((data) => {
            if (data.inspections) setInspections(data.inspections);
          })
          .catch((err) => console.error("Error fetching inspections:", err))
          .finally(() => setInspectionsLoading(false));
      }
    }
  }, [activeTab, dailySubTab, project.id]);

  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorPurpose || !visitorDatetime) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/visitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName,
          organization: visitorOrg || null,
          purpose: visitorPurpose,
          visitDatetime: visitorDatetime,
          badgeNumber: visitorBadge || null,
          remarks: visitorRemarks || null,
          escortedById: visitorEscortId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setVisitors([data.visitor, ...visitors]);
        setVisitorName("");
        setVisitorOrg("");
        setVisitorPurpose("Inspection");
        setVisitorDatetime("");
        setVisitorBadge("");
        setVisitorEscortId("");
        setVisitorRemarks("");
      } else {
        alert(data.error || "Failed to log visitor");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionType || !inspectorNameField || !inspectionDate || !inspectionArea || !inspectionOutcome) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionType,
          inspectorName: inspectorNameField,
          inspectionDate,
          area: inspectionArea,
          outcome: inspectionOutcome,
          followUpDate: inspectionFollowUp || null,
          findings: inspectionFindings || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInspections([data.inspection, ...inspections]);
        setInspectorNameField("");
        setInspectionDate("");
        setInspectionArea("");
        setInspectionOutcome("PASSED");
        setInspectionFollowUp("");
        setInspectionFindings("");
      } else {
        alert(data.error || "Failed to save inspection");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Task handlers
  const handleTaskStatusChange = async (taskId: string, newStatus: string, currentProgress: number) => {
    let finalProgress = currentProgress;
    if (newStatus === "COMPLETED") {
      finalProgress = 100;
    } else if (newStatus === "APPROVED" && currentProgress === 100) {
      finalProgress = 0;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, progress: finalProgress }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: data.task.status, progress: data.task.progress } : t)));
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskProgressChange = async (taskId: string, newProgress: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProgress }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, progress: data.task.progress } : t)));
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          dueDate: taskDueDate,
          projectId: project.id,
          assigneeId: taskAssigneeId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTasks([...tasks, data.task]);
        setTaskTitle("");
        setTaskDesc("");
        setTaskDueDate("");
        setTaskAssigneeId("");
        setIsTaskModalOpen(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Change Orders handlers
  const handleCreateChangeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coTitle || !coDesc || !coCost) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/change-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: coTitle,
          description: coDesc,
          estimatedCost: parseFloat(coCost),
          projectId: project.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setChangeOrders([data.changeOrder, ...changeOrders]);
        setCoTitle("");
        setCoDesc("");
        setCoCost("");
        setIsCOModalOpen(false);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCO = async (coId: string) => {
    try {
      const res = await fetch(`/api/change-orders/${coId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        const data = await res.json();
        setChangeOrders(changeOrders.map((co) => (co.id === coId ? { ...co, status: data.changeOrder.status } : co)));
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectCO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCoId || !rejectionReason) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/change-orders/${activeCoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason }),
      });

      if (res.ok) {
        const data = await res.json();
        setChangeOrders(changeOrders.map((co) => (co.id === activeCoId ? { ...co, status: data.changeOrder.status, rejectionReason: data.changeOrder.rejectionReason } : co)));
        setCoRejectionModalOpen(false);
        setActiveCoId(null);
        setRejectionReason("");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Notes handlers
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, content: noteContent }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotes([data.note, ...notes]);
        setNoteTitle("");
        setNoteContent("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getCOStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { backgroundColor: "rgba(34, 197, 94, 0.15)", color: "var(--success)" };
      case "REJECTED":
        return { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--error)" };
      default:
        return { backgroundColor: "rgba(234, 179, 8, 0.15)", color: "var(--warning)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Tab Menu Header */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {[
          { id: "dashboard",  label: "📊 Overview" },
          ...(isHeadOffice ? [{ id: "crew", label: "👷 Team" }] : []),
          { id: "daily-logs", label: "📋 Daily Logs" },
          ...(!isOE ? [{ id: "inventory", label: "📦 Inventory" }] : []),
          { id: "reports",    label: "📝 Reports" },
          { id: "documents",  label: "📁 Documents" },
          { id: "schedule",   label: "📅 Schedule" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="btn"
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "white" : "var(--text-secondary)",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="animate-fade-in" style={{ minHeight: "60vh" }}>

        {/* OVERVIEW */}
        {activeTab === "dashboard" && (() => {
          const approvedCOs = changeOrders.filter(co => co.status === "APPROVED");
          const revisedBudget = project.budget + approvedCOs.reduce((s, co) => s + co.estimatedCost, 0);
          const physicalProgress = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
          const today = new Date();
          const endDate = project.endDate ? new Date(project.endDate) : null;
          const lagDays = endDate ? Math.round((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const isOverdue = lagDays !== null && lagDays > 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Category badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ padding: "4px 14px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", backgroundColor: project.category === "HIGHWAY" ? "rgba(251,146,60,0.15)" : project.category === "INFRASTRUCTURE" ? "rgba(99,102,241,0.15)" : "rgba(34,197,94,0.15)", color: project.category === "HIGHWAY" ? "#fb923c" : project.category === "INFRASTRUCTURE" ? "var(--accent)" : "var(--success)" }}>
                  {project.category === "HIGHWAY" ? "🛣️ Highway" : project.category === "INFRASTRUCTURE" ? "🏗️ Infrastructure" : "🏢 Building"}
                </span>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Project Classification</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Specs */}
                  <section className="glass-panel" style={{ padding: "24px" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Project Specifications</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <div><span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Manager</span><span style={{ fontSize: "14px", fontWeight: 600 }}>{project.manager.firstName} {project.manager.lastName}</span></div>
                      <div><span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Baseline Budget</span><span style={{ fontSize: "14px", fontWeight: 600 }}>{formatCurrency(project.budget)}</span></div>
                      <div><span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Location</span><span style={{ fontSize: "14px", fontWeight: 600 }}>{project.location}</span></div>
                      <div><span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</span><span style={{ fontSize: "14px", fontWeight: 600 }}>{project.status.replace(/_/g, " ")}</span></div>
                      <div><span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Start Date</span><span style={{ fontSize: "14px", fontWeight: 600 }}>{project.startDate}</span></div>
                      <div><span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>End Date</span><span style={{ fontSize: "14px", fontWeight: 600 }}>{project.endDate ?? "TBD"}</span></div>
                    </div>
                  </section>

                  {/* Progress Matrix */}
                  <section className="glass-panel" style={{ padding: "24px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>📈 Executive Progress Matrix</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div style={{ padding: "16px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Budget Comparison</div>
                        <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: "var(--text-secondary)" }}>Baseline:</span><span style={{ fontWeight: 700 }}>{formatCurrency(project.budget)}</span></div>
                        <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: "var(--text-secondary)" }}>Revised (w/ COs):</span><span style={{ fontWeight: 700, color: revisedBudget > project.budget ? "var(--warning)" : "var(--success)" }}>{formatCurrency(revisedBudget)}</span></div>
                        <div style={{ fontSize: "11px", borderTop: "1px solid var(--border)", paddingTop: "4px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-muted)" }}>CO Additions:</span><span style={{ color: "var(--accent)" }}>+{formatCurrency(revisedBudget - project.budget)}</span></div>
                      </div>
                      <div style={{ padding: "16px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Physical Progress</div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: physicalProgress >= 80 ? "var(--success)" : physicalProgress >= 40 ? "var(--accent)" : "var(--warning)" }}>{physicalProgress}%</div>
                        <div style={{ height: "6px", backgroundColor: "var(--border)", borderRadius: "var(--radius-full)", overflow: "hidden", marginTop: "8px" }}><div style={{ height: "100%", width: `${physicalProgress}%`, backgroundColor: physicalProgress >= 80 ? "var(--success)" : physicalProgress >= 40 ? "var(--accent)" : "var(--warning)", transition: "width 0.4s ease" }} /></div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>Based on {tasks.length} work orders</div>
                      </div>
                    </div>
                  </section>

                  {/* Lag Analysis */}
                  <section className="glass-panel" style={{ padding: "24px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>⏱️ Schedule Lag Analysis</h4>
                    <div style={{ padding: "12px 20px", borderRadius: "var(--radius-sm)", backgroundColor: isOverdue ? "rgba(239,68,68,0.08)" : lagDays === null ? "var(--bg-base)" : "rgba(34,197,94,0.08)", border: `1px solid ${isOverdue ? "var(--error)" : lagDays === null ? "var(--border)" : "var(--success)"}`, marginBottom: "16px", display: "inline-block" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Schedule Variance</div>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: isOverdue ? "var(--error)" : lagDays === null ? "var(--text-secondary)" : "var(--success)" }}>
                        {lagDays === null ? "No end date set" : isOverdue ? `+${lagDays} days behind schedule` : lagDays === 0 ? "On schedule" : `-${Math.abs(lagDays)} days ahead`}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Lag Reason / Remarks (for audit trail)</label>
                      <textarea
                        placeholder="Document reasons for schedule variance..."
                        rows={3}
                        style={{ width: "100%", padding: "10px", fontFamily: "inherit", fontSize: "13px" }}
                        defaultValue={project.lagReason || ""}
                        onBlur={async (e) => {
                          await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lagReason: e.target.value }) });
                        }}
                      />
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Auto-saves on blur. Used for downstream auditing.</div>
                    </div>
                  </section>
                </div>

                <section className="glass-panel" style={{ padding: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Project Team</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px" }}>{project.manager.firstName[0]}</div>
                      <div><div style={{ fontSize: "13px", fontWeight: 600 }}>{project.manager.firstName} {project.manager.lastName}</div><div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Project Manager</div></div>
                    </div>
                    {project.engineers.map(e => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px" }}>{e.firstName[0]}</div>
                        <div><div style={{ fontSize: "13px", fontWeight: 600 }}>{e.firstName} {e.lastName}</div><div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{e.role.replace(/_/g, " ")}</div></div>
                      </div>
                    ))}
                  </div>
                  {project.description && (
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Description</div>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{project.description}</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          );
        })()}

        {/* TEAM — Head Office only */}
        {isHeadOffice && activeTab === "crew" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Project Team</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
              {[project.manager, ...project.engineers].map(member => (
                <div key={member.id} className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "18px", flexShrink: 0 }}>{member.firstName[0]}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{member.firstName} {member.lastName}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{member.role.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{member.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DAILY LOGS with sub-tabs */}
        {activeTab === "daily-logs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {/* Sub-Tab Nav */}
            <div style={{ display: "flex", gap: "4px", overflowX: "auto", marginBottom: "24px", borderBottom: "2px solid var(--border)" }}>
              {[
                { id: "qc-log",        label: "📋 QC Log" },
                { id: "work-orders",   label: "🔧 Work Orders" },
                { id: "change-orders", label: "💸 Change Orders" },
                { id: "notes",         label: "📓 Notes" },
                { id: "visitors",      label: "👥 Visitors" },
                { id: "inspection",    label: "🔍 Inspection" },
              ].map(sub => (
                <button key={sub.id} onClick={() => setDailySubTab(sub.id as any)} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: dailySubTab === sub.id ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: "-2px", fontWeight: 700, fontSize: "13px", color: dailySubTab === sub.id ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s ease" }}>
                  {sub.label}
                </button>
              ))}
            </div>

            {/* QC LOG */}
            {dailySubTab === "qc-log" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Daily Quality Control Log</h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Site Engineers submit daily equipment, manpower, and activity logs. Project Managers review and approve.</p>
                </div>
                <ReportsDashboard initialReports={initialReports.filter(r => r.project.id === project.id)} projects={[project as any]} currentUser={{ id: currentUser.id, role: currentUser.role, firstName: currentUser.firstName, lastName: currentUser.lastName }} />
              </div>
            )}

            {/* WORK ORDERS */}
            {dailySubTab === "work-orders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Work Orders</h4>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Track and manage site work orders assigned to crew members.</p>
                  </div>
                  {canModifyTasks && <button onClick={() => setIsTaskModalOpen(true)} className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }}>+ New Work Order</button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  {[{ id: "DRAFT", label: "📋 Draft" }, { id: "PENDING_APPROVAL", label: "⏳ Pending" }, { id: "APPROVED", label: "✅ Approved" }, { id: "IN_PROGRESS", label: "🚧 In Progress" }, { id: "COMPLETED", label: "🎉 Done" }].map(col => {
                    const colTasks = tasks.filter(t => t.status === col.id);
                    return (
                      <div key={col.id} className="glass-panel" style={{ padding: "16px", minHeight: "280px", border: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 700, fontSize: "12px", borderBottom: "2px solid var(--border)", paddingBottom: "8px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                          <span>{col.label}</span><span style={{ opacity: 0.6 }}>({colTasks.length})</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {colTasks.map(task => (
                            <div key={task.id} style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)" }}>
                              <h5 style={{ fontWeight: 700, fontSize: "13px" }}>{task.title}</h5>
                              {task.description && <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{task.description}</p>}
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "8px", color: "var(--text-muted)" }}>
                                <span>📅 {task.dueDate}</span><span>👤 {task.assignee ? task.assignee.firstName : "Unassigned"}</span>
                              </div>
                              {(!isOE || task.assigneeId === currentUser.id) && (
                                <div style={{ display: "flex", gap: "4px", marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                                  {task.status !== "DRAFT" && <button onClick={() => { const s = ["DRAFT","PENDING_APPROVAL","APPROVED","IN_PROGRESS","COMPLETED"]; const i = s.indexOf(task.status); if (i > 0) handleTaskStatusChange(task.id, s[i-1], task.progress); }} style={{ flex: 1, padding: "2px", fontSize: "9px" }} className="btn btn-secondary">◀</button>}
                                  {task.status !== "COMPLETED" && <button onClick={() => { const s = ["DRAFT","PENDING_APPROVAL","APPROVED","IN_PROGRESS","COMPLETED"]; const i = s.indexOf(task.status); if (i < s.length-1) handleTaskStatusChange(task.id, s[i+1], task.progress); }} style={{ flex: 1, padding: "2px", fontSize: "9px" }} className="btn btn-secondary">▶</button>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHANGE ORDERS */}
            {dailySubTab === "change-orders" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Change Orders</h4>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Requests for deviations from the approved scope, budget, or schedule.</p>
                  </div>
                  {canRequestCO && <button onClick={() => setIsCOModalOpen(true)} className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }}>+ Request Change Order</button>}
                </div>
                {changeOrders.length === 0 ? (
                  <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: "36px", marginBottom: "8px" }}>💸</div><p>No change orders yet.</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {changeOrders.map(co => {
                      const badgeStyle = getCOStatusBadgeStyle(co.status);
                      return (
                        <div key={co.id} className="glass-panel" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <h5 style={{ fontWeight: 700, fontSize: "14px" }}>{co.title}</h5>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>{co.description}</p>
                            <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px" }}>
                              <span>Cost: <strong style={{ color: "var(--accent)" }}>{formatCurrency(co.estimatedCost)}</strong></span>
                              <span>By: {co.requester.firstName} {co.requester.lastName}</span>
                            </div>
                            {co.rejectionReason && <div style={{ fontSize: "11px", color: "var(--error)", borderLeft: "3px solid var(--error)", padding: "4px 8px", marginTop: "8px" }}>Rejected: {co.rejectionReason}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                            <span style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, borderRadius: "var(--radius-full)", ...badgeStyle }}>{co.status.replace(/_/g, " ")}</span>
                            {canApproveCO && co.status === "PENDING_APPROVAL" && (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => { setActiveCoId(co.id); setCoRejectionModalOpen(true); }} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "11px", borderColor: "var(--error)", color: "var(--error)" }}>Reject</button>
                                <button onClick={() => handleApproveCO(co.id)} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px", backgroundColor: "var(--success)", border: "none" }}>Approve</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* NOTES */}
            {dailySubTab === "notes" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
                <div className="glass-panel" style={{ padding: "20px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>New Note</h4>
                  <form onSubmit={handleCreateNote} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div><label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Title *</label><input type="text" required placeholder="e.g. Cable inspection update" style={{ width: "100%", padding: "8px" }} value={noteTitle} onChange={e => setNoteTitle(e.target.value)} /></div>
                    <div><label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Content *</label><textarea required rows={5} style={{ width: "100%", padding: "8px", fontFamily: "inherit" }} value={noteContent} onChange={e => setNoteContent(e.target.value)} /></div>
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Posting..." : "Post Note"}</button>
                  </form>
                </div>
                <div className="glass-panel" style={{ padding: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Project Notes Log (Sandboxed)</h4>
                  {notesLoading ? <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div> : notes.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No notes yet for your system role.</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {notes.map(n => (
                        <div key={n.id} style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <h5 style={{ fontWeight: 700, fontSize: "14px" }}>{n.title}</h5>
                            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{n.content}</p>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px", textAlign: "right" }}>— {n.author.firstName} {n.author.lastName} · {n.author.role.replace(/_/g, " ")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VISITORS */}
            {dailySubTab === "visitors" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Site Visitor Log</h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Record all visitors who access the construction site for safety and compliance.</p>
                </div>
                {isHeadOffice && (
                  <div className="glass-panel" style={{ padding: "24px", border: "1px dashed var(--border)" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>👥 Log New Visitor</span>
                    <form onSubmit={handleCreateVisitor}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Visitor Name *</label><input type="text" required placeholder="Full name" style={{ width: "100%", padding: "8px 12px" }} value={visitorName} onChange={e => setVisitorName(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Organization</label><input type="text" placeholder="Company or agency" style={{ width: "100%", padding: "8px 12px" }} value={visitorOrg} onChange={e => setVisitorOrg(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Purpose of Visit *</label><select style={{ width: "100%", padding: "8px 12px" }} value={visitorPurpose} onChange={e => setVisitorPurpose(e.target.value)}><option value="INSPECTION">Inspection</option><option value="CLIENT_REVIEW">Client Review</option><option value="REGULATORY_AUDIT">Regulatory Audit</option><option value="MATERIAL_DELIVERY">Material Delivery</option><option value="SAFETY_WALKTHROUGH">Safety Walkthrough</option><option value="OTHER">Other</option></select></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Date &amp; Time *</label><input type="datetime-local" required style={{ width: "100%", padding: "8px 12px" }} value={visitorDatetime} onChange={e => setVisitorDatetime(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Badge / ID Number</label><input type="text" placeholder="Visitor ID or badge #" style={{ width: "100%", padding: "8px 12px" }} value={visitorBadge} onChange={e => setVisitorBadge(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Escorted By</label><select style={{ width: "100%", padding: "8px 12px" }} value={visitorEscortId} onChange={e => setVisitorEscortId(e.target.value)}><option value="">Select crew member...</option>{project.engineers.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
                      </div>
                      <div style={{ marginTop: "16px" }}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Remarks</label><textarea rows={2} placeholder="Any notes about this visit..." style={{ width: "100%", padding: "8px 12px", fontFamily: "inherit" }} value={visitorRemarks} onChange={e => setVisitorRemarks(e.target.value)} /></div>
                      <button type="submit" className="btn btn-primary" style={{ marginTop: "16px", backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Saving..." : "Log Visitor Entry"}</button>
                    </form>
                  </div>
                )}
                
                <div className="glass-panel" style={{ padding: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Visitor History</h4>
                  {visitorsLoading ? <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Loading...</div> : visitors.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No visitors logged yet for this project.</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {visitors.map(v => (
                        <div key={v.id} style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <h5 style={{ fontWeight: 700, fontSize: "14px" }}>{v.visitorName} {v.organization && <span style={{ fontWeight: 400, opacity: 0.6 }}>({v.organization})</span>}</h5>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{new Date(v.visitDatetime).toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Purpose: <strong>{v.purpose.replace(/_/g, " ")}</strong></div>
                          {v.remarks && <p style={{ fontSize: "12px", marginTop: "6px", fontStyle: "italic" }}>{v.remarks}</p>}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
                            <span>Escort: {v.escortedBy ? `${v.escortedBy.firstName} ${v.escortedBy.lastName}` : "None"}</span>
                            <span>Logged By: {v.loggedBy.firstName} {v.loggedBy.lastName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INSPECTION */}
            {dailySubTab === "inspection" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Site Inspection Records</h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Document site inspections, safety audits, and quality checks.</p>
                </div>
                {(isCE || isPM || isHeadOffice) && (
                  <div className="glass-panel" style={{ padding: "24px", border: "1px dashed var(--border)" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>🔍 New Inspection Record</span>
                    <form onSubmit={handleCreateInspection}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Inspection Type *</label><select style={{ width: "100%", padding: "8px 12px" }} value={inspectionType} onChange={e => setInspectionType(e.target.value)}><option value="STRUCTURAL_SAFETY">Structural Safety</option><option value="QUALITY_CONTROL">Quality Control (QC)</option><option value="ENVIRONMENTAL_COMPLIANCE">Environmental Compliance</option><option value="FIRE_LIFE_SAFETY">Fire &amp; Life Safety</option><option value="MATERIAL_ACCEPTANCE">Material Acceptance</option><option value="FINAL_WALKTHROUGH">Final Walkthrough</option><option value="OTHER">Other</option></select></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Inspector Name *</label><input type="text" required placeholder="Full name of inspector" style={{ width: "100%", padding: "8px 12px" }} value={inspectorNameField} onChange={e => setInspectorNameField(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Inspection Date *</label><input type="date" required style={{ width: "100%", padding: "8px 12px" }} value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Area / Zone *</label><input type="text" required placeholder="e.g. Foundation, Block A" style={{ width: "100%", padding: "8px 12px" }} value={inspectionArea} onChange={e => setInspectionArea(e.target.value)} /></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Outcome *</label><select style={{ width: "100%", padding: "8px 12px" }} value={inspectionOutcome} onChange={e => setInspectionOutcome(e.target.value)}><option value="PASSED">Passed</option><option value="FAILED">Failed — Action Required</option><option value="CONDITIONAL">Conditional Pass</option><option value="PENDING">Pending Review</option></select></div>
                        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Follow-up Due Date</label><input type="date" style={{ width: "100%", padding: "8px 12px" }} value={inspectionFollowUp} onChange={e => setInspectionFollowUp(e.target.value)} /></div>
                      </div>
                      <div style={{ marginTop: "16px" }}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Findings &amp; Notes</label><textarea rows={3} placeholder="Describe findings or recommendations..." style={{ width: "100%", padding: "8px 12px", fontFamily: "inherit" }} value={inspectionFindings} onChange={e => setInspectionFindings(e.target.value)} /></div>
                      <button type="submit" className="btn btn-primary" style={{ marginTop: "16px", backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Saving..." : "Save Inspection Record"}</button>
                    </form>
                  </div>
                )}
                
                <div className="glass-panel" style={{ padding: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Inspection Logs</h4>
                  {inspectionsLoading ? <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Loading...</div> : inspections.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No inspection records logged yet.</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {inspections.map(ins => (
                        <div key={ins.id} style={{ padding: "14px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-base)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <h5 style={{ fontWeight: 700, fontSize: "14px" }}>{ins.inspectionType.replace(/_/g, " ")} <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "var(--radius-sm)", backgroundColor: ins.outcome === "PASSED" ? "rgba(34,197,94,0.15)" : ins.outcome === "FAILED" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)", color: ins.outcome === "PASSED" ? "var(--success)" : ins.outcome === "FAILED" ? "var(--error)" : "var(--warning)" }}>{ins.outcome}</span></h5>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{ins.inspectionDate}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Inspector: <strong>{ins.inspectorName}</strong> | Zone: <strong>{ins.area}</strong></div>
                          {ins.findings && <p style={{ fontSize: "12px", marginTop: "6px" }}>{ins.findings}</p>}
                          {ins.followUpDate && <div style={{ fontSize: "11px", color: "var(--warning)", marginTop: "4px" }}>⚠️ Follow-up Due: {ins.followUpDate}</div>}
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "6px", textAlign: "right" }}>Conducted By: {ins.conductedBy.firstName} {ins.conductedBy.lastName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVENTORY */}
        {!isOE && activeTab === "inventory" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <div>
                <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Project Material Inventory</h4>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Material allocations and current consumption tracking.
                </p>
              </div>
            </div>

            {project.materials.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No materials assigned.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {project.materials.map(m => {
                  const percent = m.allocatedQty > 0 ? (m.consumedQty / m.allocatedQty) * 100 : 0;
                  const remaining = m.allocatedQty - m.consumedQty;
                  
                  // Color codes
                  let statusColor = "var(--success)";
                  if (percent >= 100) {
                    statusColor = "var(--error)";
                  } else if (percent >= 90) {
                    statusColor = "var(--warning)";
                  } else if (percent >= 70) {
                    statusColor = "#f59e0b"; // amber
                  }

                  const isCritical = percent >= 90 && percent < 100;
                  const isExhausted = percent >= 100;

                  return (
                    <div key={m.id} className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {/* Name & Details row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "14px" }}>{m.material.name}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                          Unit: {m.material.unit}
                        </span>
                      </div>

                      {/* Clean Minimalistic metrics */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-sm)", padding: "10px", border: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Allocated</div>
                          <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>{m.allocatedQty.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Consumed</div>
                          <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px", color: percent >= 90 ? "var(--error)" : "inherit" }}>{m.consumedQty.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>Remaining</div>
                          <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px", color: remaining <= 0 ? "var(--error)" : "inherit" }}>{Math.max(0, remaining).toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                          <span>Consumption Progress</span>
                          <span style={{ fontWeight: 700 }}>{Math.round(percent)}%</span>
                        </div>
                        <div style={{ height: "6px", backgroundColor: "var(--border)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(percent, 100)}%`, backgroundColor: statusColor, transition: "width 0.4s ease" }} />
                        </div>
                      </div>

                      {/* Alert banner */}
                      {(isCritical || isExhausted) && (
                        <div style={{ 
                          padding: "8px 12px", 
                          background: isExhausted ? "rgba(239, 68, 68, 0.08)" : "rgba(234, 179, 8, 0.08)", 
                          borderLeft: `3px solid ${isExhausted ? "var(--error)" : "var(--warning)"}`,
                          borderRadius: "var(--radius-sm)", 
                          fontSize: "12px", 
                          color: isExhausted ? "var(--error)" : "var(--warning)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          <span>{isExhausted ? "❌" : "⚠️"}</span>
                          <span>
                            {isExhausted
                              ? `Exhausted: 100% of allocated ${m.material.name} has been consumed.`
                              : `Critical: ${Math.round(percent)}% consumed. Only ${Math.max(0, remaining).toLocaleString()} ${m.material.unit} remaining.`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* REPORTS */}
        {activeTab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {isOE ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Office Engineers do not have compilation or read access to high-level Weekly &amp; Monthly Reports.</p>
                <button
                  onClick={() => {
                    setActiveTab("daily-logs");
                    setDailySubTab("qc-log");
                  }}
                  className="btn btn-primary"
                  style={{ backgroundColor: "var(--accent)", border: "none" }}
                >
                  📝 Log Daily Report
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Weekly &amp; Monthly Compiled Reports</h4>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Project Managers compile and annotate weekly and monthly summary reports from daily logs.</p>
                </div>
                <SummaryDashboard initialSummaries={initialSummaries.filter(s => s.project.id === project.id)} projects={[project as any]} currentUser={{ role: currentUser.role }} />
              </>
            )}
          </div>
        )}

        {/* DOCUMENTS — unified with category tabs */}
        {activeTab === "documents" && (
          <section className="glass-panel" style={{ padding: "24px" }}>
            <ProjectDocuments projectId={project.id} initialDocuments={project.documents} canUpload={!isOE} />
          </section>
        )}

        {/* SCHEDULE */}
        {activeTab === "schedule" && (
          <section className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Master Project Schedule</h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Upload an Excel (.xlsx) schedule file. It will be parsed into WBS, Resource, and Budget segments.
                You can re-upload at any time to update the schedule.
              </p>
            </div>
            <ScheduleUploader projectId={project.id} />
          </section>
        )}

      </div>

{/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Add Task / Work Order</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsTaskModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Task Title *</label>
                <input type="text" required placeholder="Anchor bolt inspections..." style={{ width: "100%", padding: "8px" }} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                <textarea placeholder="Describe work scope..." rows={3} style={{ width: "100%", padding: "8px", fontFamily: "inherit" }} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Due Date *</label>
                <input type="date" required style={{ width: "100%", padding: "8px" }} value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Assignee</label>
                <select style={{ width: "100%", padding: "8px" }} value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
                  <option value="">Select Crew Member...</option>
                  {project.engineers.map((eng) => <option key={eng.id} value={eng.id}>{eng.firstName} {eng.lastName}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Saving..." : "Save Work Order"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Order Creation Modal */}
      {isCOModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Request Change Order</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsCOModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateChangeOrder} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Change Title *</label>
                <input type="text" required placeholder="Extra concrete layer for pier..." style={{ width: "100%", padding: "8px" }} value={coTitle} onChange={(e) => setCoTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description *</label>
                <textarea required placeholder="Detailed reason for deviation..." rows={4} style={{ width: "100%", padding: "8px", fontFamily: "inherit" }} value={coDesc} onChange={(e) => setCoDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Estimated Cost ($) *</label>
                <input type="number" required placeholder="4500" style={{ width: "100%", padding: "8px" }} value={coCost} onChange={(e) => setCoCost(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCOModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Submitting..." : "Submit Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Order Rejection Modal */}
      {coRejectionModalOpen && activeCoId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Reject Change Order</h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>Please specify the reason for rejecting this change order request.</p>
            <form onSubmit={handleRejectCO}>
              <textarea
                required
                placeholder="Cost estimate exceeds allocation thresholds..."
                rows={3}
                style={{ width: "100%", padding: "8px", fontFamily: "inherit", fontSize: "13px", marginBottom: "16px" }}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCoRejectionModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--error)", border: "none" }}>Reject Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

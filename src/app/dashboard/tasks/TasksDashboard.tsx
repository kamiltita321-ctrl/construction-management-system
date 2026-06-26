"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
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
  project: { name: string; code: string };
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
  project: { name: string; code: string };
  requester: { firstName: string; lastName: string };
  approver: { firstName: string; lastName: string } | null;
}

interface TasksDashboardProps {
  initialTasks: Task[];
  initialChangeOrders: ChangeOrder[];
  projects: Project[];
  engineers: User[];
  currentUser: { id: string; email: string; role: string; firstName: string; lastName: string };
}

export default function TasksDashboard({
  initialTasks,
  initialChangeOrders,
  projects,
  engineers,
  currentUser,
}: TasksDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"work-orders" | "change-orders">("work-orders");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(initialChangeOrders);

  // Modals / forms state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCOModalOpen, setIsCOModalOpen] = useState(false);
  const [coRejectionModalOpen, setCoRejectionModalOpen] = useState(false);
  const [activeCoId, setActiveCoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Create Task form fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");

  // Create Change Order form fields
  const [coTitle, setCoTitle] = useState("");
  const [coDesc, setCoDesc] = useState("");
  const [coCost, setCoCost] = useState("");
  const [coProjectId, setCoProjectId] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const isSE = currentUser.role === "SITE_ENGINEER";
  const isPM = currentUser.role === "PROJECT_MANAGER";
  const isGMorDGM = currentUser.role === "GENERAL_MANAGER" || currentUser.role === "DEPUTY_GENERAL_MANAGER";
  const canCreate = currentUser.role === "SYSTEM_ADMIN" || currentUser.role === "VP_OF_CONSTRUCTION" || isPM;

  // Task Status updates
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
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update task status.");
      }
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
    }
  };

  // Submit Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate || !taskProjectId) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          dueDate: taskDueDate,
          projectId: taskProjectId,
          assigneeId: taskAssigneeId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTasks([...tasks, data.task]);
        setTaskTitle("");
        setTaskDesc("");
        setTaskDueDate("");
        setTaskProjectId("");
        setTaskAssigneeId("");
        setIsTaskModalOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to create task.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Change Order
  const handleCreateChangeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coTitle || !coDesc || !coCost || !coProjectId) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/change-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: coTitle,
          description: coDesc,
          estimatedCost: coCost,
          projectId: coProjectId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setChangeOrders([data.changeOrder, ...changeOrders]);
        setCoTitle("");
        setCoDesc("");
        setCoCost("");
        setCoProjectId("");
        setIsCOModalOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to submit request.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve Change Order (Approve/Reject)
  const handleResolveChangeOrder = async (coId: string, status: "APPROVED" | "REJECTED", reason?: string) => {
    try {
      const res = await fetch(`/api/change-orders/${coId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });

      if (res.ok) {
        const data = await res.json();
        setChangeOrders(changeOrders.map((co) => (co.id === coId ? { ...co, status: data.changeOrder.status, rejectionReason: data.changeOrder.rejectionReason } : co)));
        setCoRejectionModalOpen(false);
        setRejectionReason("");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Resolution failed.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Columns for Kanban Board
  const COLUMNS = [
    { id: "DRAFT", title: "Draft / Backlog", bg: "rgba(255,255,255,0.01)" },
    { id: "APPROVED", title: "Assigned / Ready", bg: "rgba(59, 130, 246, 0.02)" },
    { id: "IN_PROGRESS", title: "In Progress", bg: "rgba(234, 179, 8, 0.02)" },
    { id: "COMPLETED", title: "Ready for Inspection", bg: "rgba(34, 197, 94, 0.02)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Navigation Tabs */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          padding: "6px",
          gap: "8px",
          width: "fit-content",
          borderRadius: "var(--radius-md)",
        }}
      >
        <button
          className={`btn ${activeTab === "work-orders" ? "btn-primary" : "btn-secondary"}`}
          style={{ border: "none", fontSize: "14px", padding: "8px 20px" }}
          onClick={() => setActiveTab("work-orders")}
        >
          📋 Tasks
        </button>
        <button
          className={`btn ${activeTab === "change-orders" ? "btn-primary" : "btn-secondary"}`}
          style={{ border: "none", fontSize: "14px", padding: "8px 20px" }}
          onClick={() => setActiveTab("change-orders")}
        >
          🔄 Change Orders
        </button>
      </div>

      {/* Tab Content 1: Kanban Tasks */}
      {activeTab === "work-orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 700 }}>Task Kanban Board</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Log daily execution status, complete task lists, and track progress.
              </p>
            </div>
            {canCreate && (
              <button className="btn btn-primary" onClick={() => setIsTaskModalOpen(true)}>
                ➕ New Task
              </button>
            )}
          </div>

          {/* Kanban Columns Grid */}
          <div
            className="animate-slide-up"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="glass-panel"
                  style={{
                    padding: "20px",
                    backgroundColor: col.bg,
                    minHeight: "500px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {col.title}
                    </h4>
                    <span
                      style={{
                        padding: "2px 6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
                    {colTasks.length === 0 && (
                      <div
                        style={{
                          border: "1px dashed var(--border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "16px",
                          textAlign: "center",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                        }}
                      >
                        No items in this column
                      </div>
                    )}
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="glass-panel"
                        style={{
                          padding: "16px",
                          backgroundColor: "var(--bg-surface)",
                          boxShadow: "var(--shadow-sm)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {/* Project Code */}
                        <span
                          style={{
                            alignSelf: "flex-start",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(249, 115, 22, 0.06)",
                            color: "var(--accent)",
                          }}
                        >
                          {task.project.code}
                        </span>

                        <h5 style={{ fontSize: "14px", fontWeight: 700 }}>{task.title}</h5>

                        {task.description && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              lineHeight: "1.4",
                            }}
                          >
                            {task.description}
                          </p>
                        )}

                        {/* Assignee & Date */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            borderTop: "1px solid var(--border)",
                            paddingTop: "10px",
                          }}
                        >
                          <span>👷 {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName.substring(0, 1)}.` : "Unassigned"}</span>
                          <span>📅 {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>

                        {/* Progress Bar / Toggle controls */}
                        {task.status !== "DRAFT" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700 }}>
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={task.progress}
                              onChange={(e) => handleTaskProgressChange(task.id, parseInt(e.target.value))}
                              disabled={isSE && task.assigneeId !== currentUser.id}
                              style={{ width: "100%", height: "4px", accentColor: "var(--accent)", cursor: "pointer" }}
                            />
                          </div>
                        )}

                        {/* Status Mover Dropdown */}
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                          <select
                            style={{
                              flex: 1,
                              padding: "4px 8px",
                              fontSize: "11px",
                              background: "rgba(0, 0, 0, 0.2)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)",
                              color: "inherit",
                            }}
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value, task.progress)}
                          >
                            {COLUMNS.map((col) => {
                              // Restrictions: Site Engineer can only set to IN_PROGRESS or COMPLETED
                              const disabled = isSE && col.id !== "IN_PROGRESS" && col.id !== "COMPLETED";
                              return (
                                <option key={col.id} value={col.id} disabled={disabled}>
                                  Move to: {col.id.replace(/_/g, " ")}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 2: Change Orders Grid & Approvals */}
      {activeTab === "change-orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 700 }}>Change Orders Pipeline</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Request additional budgets or outline deviations from design structures.
              </p>
            </div>
            {canCreate && (
              <button className="btn btn-primary" onClick={() => setIsCOModalOpen(true)}>
                ➕ Request Change Order
              </button>
            )}
          </div>

          {/* Change Orders Table list */}
          <div className="glass-panel animate-fade-in" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "16px 20px" }}>Project</th>
                  <th style={{ padding: "16px 20px" }}>Title / Details</th>
                  <th style={{ padding: "16px 20px" }}>Est. Cost</th>
                  <th style={{ padding: "16px 20px" }}>Requester</th>
                  <th style={{ padding: "16px 20px" }}>Status</th>
                  <th style={{ padding: "16px 20px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                      No Change Orders found.
                    </td>
                  </tr>
                ) : (
                  changeOrders.map((co) => (
                    <tr key={co.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                      <td style={{ padding: "16px 20px", fontWeight: 700 }}>
                        <span style={{ color: "var(--accent)" }}>{co.project.code}</span>
                      </td>
                      <td style={{ padding: "16px 20px", maxWidth: "300px" }}>
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>{co.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{co.description}</div>
                        {co.rejectionReason && (
                          <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--error)", padding: "4px 8px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "var(--radius-sm)" }}>
                            Reason: {co.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px", fontWeight: 700 }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(co.estimatedCost)}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {co.requester.firstName} {co.requester.lastName}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "var(--radius-sm)",
                            textTransform: "uppercase",
                            backgroundColor:
                              co.status === "APPROVED"
                                ? "rgba(34, 197, 94, 0.1)"
                                : co.status === "REJECTED"
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(234, 179, 8, 0.1)",
                            color:
                              co.status === "APPROVED"
                                ? "#22c55e"
                                : co.status === "REJECTED"
                                ? "#ef4444"
                                : "#eab308",
                          }}
                        >
                          {co.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {co.status === "PENDING_APPROVAL" && isGMorDGM ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="btn btn-primary"
                              style={{ backgroundColor: "var(--success)", padding: "6px 12px", fontSize: "12px", border: "none" }}
                              onClick={() => handleResolveChangeOrder(co.id, "APPROVED")}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ borderColor: "var(--error)", color: "var(--error)", padding: "6px 12px", fontSize: "12px" }}
                              onClick={() => {
                                setActiveCoId(co.id);
                                setCoRejectionModalOpen(true);
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : co.status === "PENDING_APPROVAL" ? (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Awaiting executive approval</span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Resolved by {co.approver ? `${co.approver.firstName} ${co.approver.lastName.substring(0, 1)}.` : "Admin"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Create Task */}
      {isTaskModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>New Task</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsTaskModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Project *</label>
                <select required style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={taskProjectId} onChange={(e) => setTaskProjectId(e.target.value)}>
                  <option value="" disabled>Select project...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Title *</label>
                <input type="text" required placeholder="Bolt tightening..." style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                <textarea placeholder="Scope of works..." rows={2} style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontFamily: "inherit" }} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Assignee (Site Engineer)</label>
                <select style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {engineers.map((eng) => <option key={eng.id} value={eng.id}>{eng.firstName} {eng.lastName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Due Date *</label>
                <input type="date" required style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? "Saving..." : "Save Work Order"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Change Order Request */}
      {isCOModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Request Change Order</h4>
              <button style={{ border: "none", fontSize: "20px", cursor: "pointer" }} onClick={() => setIsCOModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateChangeOrder} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Project *</label>
                <select required style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={coProjectId} onChange={(e) => setCoProjectId(e.target.value)}>
                  <option value="" disabled>Select project...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Change Title *</label>
                <input type="text" required placeholder="Extra concrete for main pier..." style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={coTitle} onChange={(e) => setCoTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description *</label>
                <textarea required placeholder="Detailed reason for deviation..." rows={3} style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontFamily: "inherit" }} value={coDesc} onChange={(e) => setCoDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Estimated Extra Cost ($) *</label>
                <input type="number" required placeholder="4500" style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} value={coCost} onChange={(e) => setCoCost(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCOModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? "Submitting..." : "Submit Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Change Order Rejection Reason */}
      {coRejectionModalOpen && activeCoId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Reject Change Order</h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>Please specify the reason for rejecting this change order request.</p>
            <textarea
              required
              placeholder="e.g., Cost estimate exceeds allocation thresholds..."
              rows={3}
              style={{ width: "100%", padding: "10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontFamily: "inherit", fontSize: "13px", marginBottom: "16px" }}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCoRejectionModalOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "var(--error)" }}
                onClick={() => handleResolveChangeOrder(activeCoId, "REJECTED", rejectionReason)}
                disabled={!rejectionReason}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  isCompleted: boolean;
}

interface MilestonesListProps {
  projectId: string;
  initialMilestones: Milestone[];
  canEdit: boolean;
}

export default function MilestonesList({ projectId, initialMilestones, canEdit }: MilestonesListProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleCompleted = async (id: string, currentVal: boolean) => {
    if (!canEdit) return;

    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentVal }),
      });

      if (res.ok) {
        const data = await res.json();
        setMilestones(
          milestones.map((m) => (m.id === id ? { ...m, isCompleted: data.milestone.isCompleted } : m))
        );
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle milestone:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Are you sure you want to delete this milestone?")) return;

    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMilestones(milestones.filter((m) => m.id !== id));
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete milestone:", error);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          dueDate,
          projectId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Append new milestone and reset form
        setMilestones([...milestones, data.milestone].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
        setTitle("");
        setDescription("");
        setDueDate("");
        setShowAddForm(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to add milestone.");
      }
    } catch (error) {
      console.error("Failed to add milestone:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Section Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Project Milestones</h4>
        {canEdit && (
          <button
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "➕ Add Milestone"}
          </button>
        )}
      </div>

      {/* Add Milestone Form */}
      {showAddForm && (
        <form
          className="glass-panel"
          onSubmit={handleAddMilestone}
          style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Milestone Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Concrete Foundation Complete"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.15)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "inherit",
                fontSize: "13px",
              }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Description
            </label>
            <input
              type="text"
              placeholder="Brief details about scope..."
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.15)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "inherit",
                fontSize: "13px",
              }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Due Date *
            </label>
            <input
              type="date"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.15)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "inherit",
                fontSize: "13px",
              }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "10px", width: "100%", fontSize: "13px" }}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Add to Timeline"}
          </button>
        </form>
      )}

      {/* Milestones Timeline List */}
      {milestones.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px" }}>
          No milestones defined for this project timeline yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative" }}>
          {milestones.map((m) => {
            const mDate = new Date(m.dueDate);
            const isOverdue = !m.isCompleted && mDate.getTime() < Date.now();

            return (
              <div
                key={m.id}
                className="glass-panel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderLeft: `4px solid ${
                    m.isCompleted
                      ? "var(--success)"
                      : isOverdue
                      ? "var(--error)"
                      : "var(--border)"
                  }`,
                  opacity: m.isCompleted ? 0.75 : 1,
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={m.isCompleted}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                        accentColor: "var(--success)",
                      }}
                      onChange={() => handleToggleCompleted(m.id, m.isCompleted)}
                    />
                  )}
                  <div>
                    <h5
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        textDecoration: m.isCompleted ? "line-through" : "none",
                        color: m.isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                      }}
                    >
                      {m.title}
                    </h5>
                    {m.description && (
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {m.description}
                      </p>
                    )}
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "11px",
                        marginTop: "4px",
                        color: isOverdue ? "var(--error)" : "var(--text-muted)",
                        fontWeight: isOverdue ? "bold" : "normal",
                      }}
                    >
                      📅 Due: {mDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {isOverdue && " (OVERDUE)"}
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--error)",
                      cursor: "pointer",
                      fontSize: "14px",
                      padding: "8px",
                    }}
                    onClick={() => handleDelete(m.id)}
                    title="Delete milestone"
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

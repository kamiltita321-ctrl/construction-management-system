"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  revisedBudget: number | null;
  category: string;
}

export default function EditProjectPanel({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [location, setLocation] = useState(project.location);
  const [startDate, setStartDate] = useState(project.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(project.endDate?.slice(0, 10) ?? "");
  const [status, setStatus] = useState(project.status);
  const [category, setCategory] = useState(project.category);
  const [budget, setBudget] = useState(String(project.budget));
  const [revisedBudget, setRevisedBudget] = useState(project.revisedBudget ? String(project.revisedBudget) : "");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim(),
          startDate: startDate || undefined,
          endDate: endDate || null,
          status,
          category,
          budget: parseFloat(budget) || 0,
          revisedBudget: revisedBudget ? parseFloat(revisedBudget) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast("❌ " + (err.error || "Failed to save"));
      } else {
        showToast("✅ Project updated successfully");
        setOpen(false);
        router.refresh();
      }
    } catch {
      showToast("❌ Network error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    background: "var(--bg-base)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: "5px",
    letterSpacing: "0.5px",
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
          padding: "12px 20px", borderRadius: "var(--radius-sm)",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", fontSize: "14px", fontWeight: 600,
        }}>
          {toast}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="btn btn-secondary"
        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
      >
        ✏️ Edit Project
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="glass-panel" style={{
            width: "100%", maxWidth: "640px", maxHeight: "90vh",
            overflowY: "auto", padding: "32px", position: "relative",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700 }}>✏️ Edit Project</h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Update project profile — all fields are optional except name and location.</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Row 1: Name + Code */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Project Name *</label>
                  <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. City Hall Renovation" />
                </div>
                <div>
                  <label style={labelStyle}>Project Code</label>
                  <input style={{ ...inputStyle, background: "var(--bg-base)", color: "var(--text-muted)" }} value={project.code} disabled title="Project code cannot be changed" />
                </div>
              </div>

              {/* Location + Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Location *</label>
                  <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Quezon City" />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="BUILDING">🏢 Building</option>
                    <option value="HIGHWAY">🛣️ Highway</option>
                    <option value="INFRASTRUCTURE">🏗️ Infrastructure</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* Budget */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Baseline Budget (₱)</label>
                  <input type="number" style={inputStyle} value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "var(--accent)" }}>Revised Budget (₱) — optional</label>
                  <input
                    type="number"
                    style={{ ...inputStyle, border: "1px solid var(--accent)" }}
                    value={revisedBudget}
                    onChange={e => setRevisedBudget(e.target.value)}
                    placeholder="Leave blank if not revised"
                    min="0"
                    step="0.01"
                  />
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>
                    Enter only if the contract budget has been formally revised
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical" }}
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief scope or notes..."
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setOpen(false)} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving || !name.trim() || !location.trim()}>
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

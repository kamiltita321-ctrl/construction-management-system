"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AddProjectFormProps {
  managers: ProjectManager[];
}

export default function AddProjectForm({ managers }: AddProjectFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          description,
          location,
          startDate,
          endDate: endDate || null,
          budget,
          managerId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project.");
      }

      // Project created successfully
      setIsOpen(false);
      setName("");
      setCode("");
      setDescription("");
      setLocation("");
      setStartDate("");
      setEndDate("");
      setBudget("");
      setManagerId("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
        ➕ Create Project
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "540px",
              padding: "32px",
              backgroundColor: "var(--bg-surface)",
              boxShadow: "var(--shadow-lg), 0 20px 25px -5px rgba(0, 0, 0, 0.4)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ fontSize: "20px", fontWeight: 700 }}>Add New Project</h3>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
                onClick={() => setIsOpen(false)}
              >
                &times;
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "var(--error)",
                  fontSize: "14px",
                  marginBottom: "20px",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                    Project Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PRJ-2026-01"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                    }}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bridge Rehabilitation"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                    }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                  Description
                </label>
                <textarea
                  placeholder="Detail the scope of works..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "inherit",
                    fontFamily: "inherit",
                  }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Seattle, WA"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                    }}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="500000"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                    }}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                    }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                    }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="btn-secondary" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", border: "none", cursor: "default", padding: 0 }}>
                  Assigned Project Manager *
                </label>
                <select
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "inherit",
                  }}
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="" disabled>Select a manager...</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

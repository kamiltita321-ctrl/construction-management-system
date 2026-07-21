"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  managedProjects?: Array<{ id: string; name: string; code: string }>;
  siteProjects?: Array<{ id: string; name: string; code: string }>;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function AdminDashboard({ currentUserRole }: { currentUserRole: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("OFFICE_ENGINEER");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch((err) => console.error("Error loading users:", err))
      .finally(() => setLoading(false));
  };

  const loadProjects = () => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          setProjectsList(data.projects);
        }
      })
      .catch((err) => console.error("Error loading projects:", err));
  };

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("OFFICE_ENGINEER");
    setPhone("");
    setIsActive(true);
    setAssignedProjectIds([]);
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUserId(user.id);
    setEmail(user.email);
    setPassword(""); // Blank by default, only update if admin types a new one
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(user.role);
    setPhone(user.phone || "");
    setIsActive(user.isActive);

    // Populate assigned projects based on role
    const currentAssignments = user.role === "PROJECT_MANAGER"
      ? (user.managedProjects?.map((p) => p.id) || [])
      : (user.siteProjects?.map((p) => p.id) || []);
    setAssignedProjectIds(currentAssignments);

    setError("");
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const url = editingUserId ? `/api/admin/users/${editingUserId}` : "/api/admin/users";
      const method = editingUserId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(password ? { password } : {}),
          firstName,
          lastName,
          role,
          phone: phone || null,
          isActive,
          assignedProjectIds,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        if (editingUserId) {
          setUsers(users.map((u) => (u.id === editingUserId ? data.user : u)));
        } else {
          setUsers([data.user, ...users]);
        }
        setIsModalOpen(false);
      } else {
        setError(data.error || "Failed to save user profile.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProjectAssignment = (projectId: string) => {
    if (assignedProjectIds.includes(projectId)) {
      setAssignedProjectIds(assignedProjectIds.filter((id) => id !== projectId));
    } else {
      setAssignedProjectIds([...assignedProjectIds, projectId]);
    }
  };

  // Helper check to show assignment selector
  const showProjectSelector =
    role === "PROJECT_MANAGER" ||
    role === "CONSTRUCTION_ENGINEER" ||
    role === "OFFICE_ENGINEER" ||
    role === "SITE_ENGINEER";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>User Administration</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Create and manage construction system workspace profiles, roles, and project allocations.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary"
          style={{ backgroundColor: "var(--accent)", border: "none" }}
        >
          🔑 Create User Account
        </button>
      </div>

      {/* Users table */}
      <div className="glass-panel" style={{ padding: "24px", overflowX: "auto" }}>
        {loading ? (
          <div style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center", padding: "20px" }}>Loading system users...</div>
        ) : users.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center", padding: "20px" }}>No users registered.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <th style={{ padding: "10px" }}>User</th>
                <th style={{ padding: "10px" }}>Email</th>
                <th style={{ padding: "10px" }}>Role</th>
                <th style={{ padding: "10px" }}>Phone</th>
                <th style={{ padding: "10px" }}>Status</th>
                <th style={{ padding: "10px" }}>Assigned Projects</th>
                <th style={{ padding: "10px" }}>Created</th>
                <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const assignedProjs = u.role === "PROJECT_MANAGER"
                  ? (u.managedProjects || [])
                  : (u.siteProjects || []);

                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                    <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--text-secondary)" }}>{u.email}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--text-secondary)" }}>{u.phone || "-"}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: u.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: u.isActive ? "var(--success)" : "var(--error)",
                        }}
                      >
                        {u.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {assignedProjs.length > 0 ? (
                        assignedProjs.map((p) => p.code).join(", ")
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--text-muted)", fontSize: "12px" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* User Edit / Creation Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "550px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>
                {editingUserId ? "✏️ Edit User Profile" : "🔑 Log New User Profile"}
              </h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            {error && (
              <div style={{ padding: "10px 14px", backgroundColor: "rgba(239, 68, 68, 0.08)", borderLeft: "3px solid var(--error)", color: "var(--error)", fontSize: "13px", marginBottom: "16px", borderRadius: "var(--radius-sm)" }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSaveUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>First Name *</label>
                  <input type="text" required placeholder="John" style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Last Name *</label>
                  <input type="text" required placeholder="Doe" style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Email *</label>
                <input type="email" required placeholder="johndoe@company.com" style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                  {editingUserId ? "Password (leave blank to keep unchanged)" : "Password *"}
                </label>
                <input type="password" required={!editingUserId} placeholder="••••••••" style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Access Control Role *</label>
                  <select style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="GENERAL_MANAGER">General Manager</option>
                    <option value="DEPUTY_GENERAL_MANAGER">Deputy General Manager</option>
                    <option value="VP_OF_CONSTRUCTION">VP of Construction</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="CONSTRUCTION_ENGINEER">Construction Engineer</option>
                    <option value="OFFICE_ENGINEER">Office Engineer</option>
                    <option value="SITE_ENGINEER">Site Engineer</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Phone</label>
                  <input type="text" placeholder="+1 (555) 019-2834" style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              {editingUserId && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActiveCheck" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    Account is Active and allowed to sign in
                  </label>
                </div>
              )}

              {/* Assigned Projects Selector */}
              {showProjectSelector && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "8px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px", textTransform: "uppercase" }}>
                    Assigned Project Allocation
                  </label>
                  {projectsList.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No projects created in system yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto", padding: "10px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)" }}>
                      {projectsList.map((p) => {
                        const isChecked = assignedProjectIds.includes(p.id);
                        return (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              id={`proj-${p.id}`}
                              checked={isChecked}
                              onChange={() => handleToggleProjectAssignment(p.id)}
                            />
                            <label htmlFor={`proj-${p.id}`} style={{ fontSize: "12px", cursor: "pointer" }}>
                              <strong>{p.code}</strong> - {p.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isSubmitting}>
                  {isSubmitting ? "Saving Profile..." : "💾 Save Profile changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

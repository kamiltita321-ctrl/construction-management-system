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
}

export default function AdminDashboard({ currentUserRole }: { currentUserRole: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("SITE_ENGINEER");
  const [phone, setPhone] = useState("");
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

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role,
          phone: phone || null,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setUsers([data.user, ...users]);
        setIsModalOpen(false);
        // Reset form
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setRole("SITE_ENGINEER");
        setPhone("");
      } else {
        setError(data.error || "Failed to create user.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>User Administration</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Create and manage construction system workspace profiles and user access control roles.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
                <th style={{ padding: "10px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
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
                  <td style={{ padding: "12px 10px", color: "var(--text-muted)", fontSize: "12px" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Creation Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "500px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Log New User Profile</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            {error && (
              <div style={{ padding: "10px 14px", backgroundColor: "rgba(239, 68, 68, 0.08)", borderLeft: "3px solid var(--error)", color: "var(--error)", fontSize: "13px", marginBottom: "16px", borderRadius: "var(--radius-sm)" }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>First Name *</label>
                  <input type="text" required placeholder="John" style={{ width: "100%", padding: "8px" }} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Last Name *</label>
                  <input type="text" required placeholder="Doe" style={{ width: "100%", padding: "8px" }} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Email *</label>
                <input type="email" required placeholder="johndoe@company.com" style={{ width: "100%", padding: "8px" }} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Password *</label>
                <input type="password" required placeholder="••••••••" style={{ width: "100%", padding: "8px" }} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>System Role *</label>
                  <select style={{ width: "100%", padding: "8px" }} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="GENERAL_MANAGER">General Manager</option>
                    <option value="DEPUTY_GENERAL_MANAGER">Deputy General Manager</option>
                    <option value="VP_OF_CONSTRUCTION">VP of Construction</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="SITE_ENGINEER">Site Engineer</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Phone</label>
                  <input type="text" placeholder="+1 (555) 019-2834" style={{ width: "100%", padding: "8px" }} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Save User Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

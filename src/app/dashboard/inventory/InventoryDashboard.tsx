"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MaterialAllocation {
  id: string;
  projectId: string;
  project: { id: string; name: string; code: string };
  allocatedQty: number;
  consumedQty: number;
}

interface MaterialLog {
  id: string;
  quantity: number;
  actionType: string;
  referenceId: string | null;
  createdAt: string;
}

interface Material {
  id: string;
  name: string;
  unit: string;
  stockCount: number;
  minStock: number;
  allocations: MaterialAllocation[];
  logs: MaterialLog[];
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface InventoryDashboardProps {
  initialMaterials: Material[];
  projects: Project[];
  currentUser: { id: string; role: string };
}

export default function InventoryDashboard({
  initialMaterials,
  projects,
  currentUser,
}: InventoryDashboardProps) {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [activeTab, setActiveTab] = useState<"inventory" | "allocations" | "logs">("inventory");
  
  // Modals state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");

  // Create Material Form
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState("bags");
  const [matMinStock, setMatMinStock] = useState("");

  // Add Stock Form
  const [stockQty, setStockQty] = useState("");

  // Allocation Form
  const [allocProjId, setAllocProjId] = useState("");
  const [allocQty, setAllocQty] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const isExecutiveOrPM = 
    currentUser.role === "SYSTEM_ADMIN" || 
    currentUser.role === "GENERAL_MANAGER" || 
    currentUser.role === "DEPUTY_GENERAL_MANAGER" || 
    currentUser.role === "VP_OF_CONSTRUCTION" || 
    currentUser.role === "PROJECT_MANAGER";

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName || !matUnit) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: matName,
          unit: matUnit,
          minStock: matMinStock ? parseFloat(matMinStock) : 0,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMaterials([...materials, { ...data.material, allocations: [], logs: [] }]);
        setMatName("");
        setMatMinStock("");
        setIsAddMaterialOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to create material.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || !stockQty) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/materials/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: selectedMaterialId,
          quantity: parseFloat(stockQty),
          actionType: "STOCK_IN",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMaterials(
          materials.map((m) =>
            m.id === selectedMaterialId
              ? {
                  ...m,
                  stockCount: data.material.stockCount,
                  logs: [data.log, ...m.logs].slice(0, 10),
                }
              : m
          )
        );
        setStockQty("");
        setIsAddStockOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to restock material.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || !allocProjId || !allocQty) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/materials/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: allocProjId,
          materialId: selectedMaterialId,
          allocatedQty: parseFloat(allocQty),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Fetch materials again to populate new relations accurately
        const refreshRes = await fetch("/api/materials");
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) {
          setMaterials(refreshData.materials);
        }
        setAllocQty("");
        setAllocProjId("");
        setIsAllocateOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to allocate material.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compile all logs for the logs tab
  const allLogs = materials
    .flatMap((m) => m.logs.map((l) => ({ ...l, materialName: m.name, unit: m.unit })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Material & Resource Inventory</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Monitor global stock levels, log purchase restocking, and allocate project-specific resources.
          </p>
        </div>
        {isExecutiveOrPM && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setIsAddMaterialOpen(true)}
              className="btn btn-primary"
              style={{ backgroundColor: "var(--accent)", border: "none" }}
            >
              ➕ Add New Material Type
            </button>
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "20px" }}>
        <button
          onClick={() => setActiveTab("inventory")}
          style={{
            padding: "12px 4px",
            border: "none",
            borderBottom: activeTab === "inventory" ? "2px solid var(--accent)" : "none",
            background: "none",
            color: activeTab === "inventory" ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          📦 Current Inventory Stock
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          style={{
            padding: "12px 4px",
            border: "none",
            borderBottom: activeTab === "allocations" ? "2px solid var(--accent)" : "none",
            background: "none",
            color: activeTab === "allocations" ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🏗️ Project Specific Allocations
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          style={{
            padding: "12px 4px",
            border: "none",
            borderBottom: activeTab === "logs" ? "2px solid var(--accent)" : "none",
            background: "none",
            color: activeTab === "logs" ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          📜 Stock Ledger Logs
        </button>
      </div>

      {/* Main Contents */}
      {activeTab === "inventory" && (
        <div className="glass-panel" style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "16px" }}>Material Name</th>
                <th style={{ padding: "16px" }}>Unit</th>
                <th style={{ padding: "16px" }}>Global Unallocated Stock</th>
                <th style={{ padding: "16px" }}>Min Alert Level</th>
                <th style={{ padding: "16px" }}>Status</th>
                {isExecutiveOrPM && <th style={{ padding: "16px", textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "24px", color: "var(--text-muted)", textAlign: "center" }}>
                    No materials registered in the system.
                  </td>
                </tr>
              ) : (
                materials.map((m) => {
                  const isLow = m.stockCount <= m.minStock;
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "16px", fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: "16px", color: "var(--text-secondary)" }}>{m.unit}</td>
                      <td style={{ padding: "16px", fontWeight: 700, fontSize: "15px" }}>{m.stockCount}</td>
                      <td style={{ padding: "16px", color: "var(--text-secondary)" }}>{m.minStock}</td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: isLow ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                            color: isLow ? "var(--error)" : "var(--success)",
                          }}
                        >
                          {isLow ? "🚨 LOW STOCK" : "✅ HEALTHY"}
                        </span>
                      </td>
                      {isExecutiveOrPM && (
                        <td style={{ padding: "16px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => {
                                setSelectedMaterialId(m.id);
                                setIsAddStockOpen(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: "5px 10px", fontSize: "12px" }}
                            >
                              ➕ Restock
                            </button>
                            <button
                              disabled={m.stockCount <= 0}
                              onClick={() => {
                                setSelectedMaterialId(m.id);
                                setIsAllocateOpen(true);
                              }}
                              className="btn btn-primary"
                              style={{ padding: "5px 10px", fontSize: "12px", backgroundColor: "var(--accent)" }}
                            >
                              🏗️ Allocate
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "allocations" && (
        <div className="glass-panel" style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "16px" }}>Project</th>
                <th style={{ padding: "16px" }}>Material</th>
                <th style={{ padding: "16px" }}>Allocated Qty</th>
                <th style={{ padding: "16px" }}>Consumed Qty</th>
                <th style={{ padding: "16px" }}>Usage Ratio</th>
              </tr>
            </thead>
            <tbody>
              {materials.flatMap((m) => m.allocations).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", color: "var(--text-muted)", textAlign: "center" }}>
                    No materials have been allocated to active projects yet.
                  </td>
                </tr>
              ) : (
                materials.flatMap((m) =>
                  m.allocations.map((a) => {
                    const ratio = a.allocatedQty > 0 ? (a.consumedQty / a.allocatedQty) * 100 : 0;
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "16px", fontWeight: 600 }}>
                          {a.project.code} - {a.project.name}
                        </td>
                        <td style={{ padding: "16px" }}>{m.name}</td>
                        <td style={{ padding: "16px", fontWeight: 600 }}>
                          {a.allocatedQty} {m.unit}
                        </td>
                        <td style={{ padding: "16px", color: "var(--text-secondary)" }}>
                          {a.consumedQty} {m.unit}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "80px", height: "6px", backgroundColor: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(ratio, 100)}%`, height: "100%", backgroundColor: ratio > 90 ? "var(--error)" : "var(--accent)" }}></div>
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: 600 }}>{ratio.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="glass-panel" style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "16px" }}>Date</th>
                <th style={{ padding: "16px" }}>Material</th>
                <th style={{ padding: "16px" }}>Quantity Change</th>
                <th style={{ padding: "16px" }}>Type</th>
                <th style={{ padding: "16px" }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {allLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", color: "var(--text-muted)", textAlign: "center" }}>
                    No ledger transactions logged.
                  </td>
                </tr>
              ) : (
                allLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                    <td style={{ padding: "16px" }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: "16px", fontWeight: 600 }}>{log.materialName}</td>
                    <td style={{ padding: "16px", fontWeight: 700, color: log.quantity > 0 ? "var(--success)" : "var(--error)" }}>
                      {log.quantity > 0 ? `+${log.quantity}` : log.quantity} {log.unit}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          fontSize: "10px",
                          fontWeight: 700,
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: log.actionType === "STOCK_IN" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: log.actionType === "STOCK_IN" ? "var(--success)" : "var(--error)",
                        }}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-secondary)" }}>{log.referenceId || "Direct Stock Entry"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Material Modal */}
      {isAddMaterialOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Add New Material</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsAddMaterialOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddMaterial} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Material Name *</label>
                <input type="text" required placeholder="e.g. Portland Cement" style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit" }} value={matName} onChange={(e) => setMatName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Unit of Measurement *</label>
                <select required style={{ width: "100%", padding: "10px", background: "rgba(15,23,42,0.7)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit" }} value={matUnit} onChange={(e) => setMatUnit(e.target.value)}>
                  <option value="bags">bags</option>
                  <option value="tons">tons</option>
                  <option value="meters">meters</option>
                  <option value="liters">liters</option>
                  <option value="units">units</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Min Safety Level Alert</label>
                <input type="number" placeholder="e.g. 50" style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit" }} value={matMinStock} onChange={(e) => setMatMinStock(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddMaterialOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Saving..." : "Create Material"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isAddStockOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Restock Material</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsAddStockOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddStock} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Quantity to Add *</label>
                <input type="number" step="any" required placeholder="e.g. 150" style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit" }} value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddStockOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Restocking..." : "Log Restock"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Stock Modal */}
      {isAllocateOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Allocate to Project</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsAllocateOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAllocate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Target Project *</label>
                <select required style={{ width: "100%", padding: "10px", background: "rgba(15,23,42,0.7)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit" }} value={allocProjId} onChange={(e) => setAllocProjId(e.target.value)}>
                  <option value="" disabled>Select target...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Quantity to Allocate *</label>
                <input type="number" step="any" required placeholder="e.g. 50" style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit" }} value={allocQty} onChange={(e) => setAllocQty(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAllocateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isLoading}>{isLoading ? "Allocating..." : "Assign Allocation"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

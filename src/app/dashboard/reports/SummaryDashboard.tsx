"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SummaryReport {
  id: string;
  title: string;
  reportType: string;
  startDate: string;
  endDate: string;
  commentary: string | null;
  project: { code: string; name: string };
  compiler: { firstName: string; lastName: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface SummaryDashboardProps {
  initialSummaries: SummaryReport[];
  projects: Project[];
  currentUser: { role: string };
}

export default function SummaryDashboard({
  initialSummaries,
  projects,
  currentUser,
}: SummaryDashboardProps) {
  const router = useRouter();
  const [summaries, setSummaries] = useState<SummaryReport[]>(initialSummaries);
  const [isCompileOpen, setIsCompileOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<any | null>(null);

  // Compile Form State
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("WEEKLY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [commentary, setCommentary] = useState("");
  const [projectId, setProjectId] = useState("");

  // Preview State
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch summary details for modal popup details
  const handleViewSummary = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/summaries/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedSummary(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreview = async () => {
    if (!projectId || !startDate || !endDate) {
      alert("Please select project, start date, and end date to preview compilation.");
      return;
    }
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/reports/summaries?mode=preview&projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (res.ok) {
        setPreviewData(data.preview);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reportType || !startDate || !endDate || !projectId) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/reports/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          reportType,
          startDate,
          endDate,
          commentary,
          projectId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Refresh items list
        const refreshRes = await fetch("/api/reports/summaries");
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) {
          setSummaries(refreshData.summaries);
        }
        
        // Reset form
        setTitle("");
        setStartDate("");
        setEndDate("");
        setCommentary("");
        setProjectId("");
        setPreviewData(null);
        setIsCompileOpen(false);
        router.refresh();
      } else {
        alert(data.error || "Failed to compile summary report.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Compiled Summary Reports</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Review weekly or monthly progress reviews compiled from approved site logs, complete with PM commentary notes.
          </p>
        </div>
        {currentUser.role !== "OFFICE_ENGINEER" && (
          <button
            onClick={() => setIsCompileOpen(true)}
            className="btn btn-primary"
            style={{ backgroundColor: "var(--accent)", border: "none" }}
          >
            📋 Compile Summary Report
          </button>
        )}
      </div>

      {/* Grid of compiled reports */}
      {summaries.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          No summary reports compiled yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {summaries.map((summary) => (
            <div key={summary.id} className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <span
                  style={{
                    padding: "3px 8px",
                    fontSize: "10px",
                    fontWeight: 700,
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: summary.reportType === "WEEKLY" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                    color: summary.reportType === "WEEKLY" ? "#3b82f6" : "#a855f7",
                  }}
                >
                  {summary.reportType}
                </span>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginTop: "8px" }}>{summary.title}</h3>
                <span style={{ display: "block", fontSize: "11px", color: "var(--accent)", marginTop: "2px", fontWeight: 600 }}>
                  {summary.project.code} - {summary.project.name}
                </span>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                  Timeline: {new Date(summary.startDate).toLocaleDateString()} to {new Date(summary.endDate).toLocaleDateString()}
                </p>
                {summary.commentary && (
                  <p style={{ fontSize: "13px", color: "white", marginTop: "12px", borderLeft: "2px solid var(--accent)", paddingLeft: "8px", fontStyle: "italic" }}>
                    "{summary.commentary.substring(0, 100)}{summary.commentary.length > 100 ? "..." : ""}"
                  </p>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Compiled by {summary.compiler.firstName} {summary.compiler.lastName}</span>
                <button
                  onClick={() => handleViewSummary(summary.id)}
                  className="btn btn-secondary"
                  style={{ padding: "5px 12px", fontSize: "12px" }}
                >
                  🔍 View details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compile Report Modal */}
      {isCompileOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Compile Progress Summary Report</h4>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsCompileOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCompileSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Report Title *</label>
                  <input type="text" required placeholder="e.g., Weekly Summary - Week 24" style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "white" }} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Report Type *</label>
                  <select required style={{ width: "100%", padding: "10px", background: "var(--background)", border: "1px solid var(--border)", color: "white" }} value={reportType} onChange={(e) => setReportType(e.target.value)}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Project *</label>
                  <select required style={{ width: "100%", padding: "10px", background: "var(--background)", border: "1px solid var(--border)", color: "white" }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="" disabled>Select project...</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Start Date *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "white" }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>End Date *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "white" }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <button type="button" onClick={handlePreview} className="btn btn-secondary" style={{ alignSelf: "flex-start", padding: "8px 16px" }}>
                📊 Fetch Site Logs Preview
              </button>

              {/* Dynamic preview block */}
              {previewData && (
                <div style={{ padding: "16px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-base)", border: "1px solid var(--border)", fontSize: "13px" }}>
                  <h5 style={{ fontWeight: 700, marginBottom: "8px" }}>Compiled Feed Preview ({previewData.daysLogged} Approved Logs Found)</h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "10px" }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Aggregate Work Summaries:</span>
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-secondary)", marginTop: "4px", fontSize: "12px", maxHeight: "120px", overflowY: "auto" }}>{previewData.workCompletedSummary || "No approved summaries found."}</pre>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Material Consumption:</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                        {previewData.aggregatedMaterials.length === 0 ? (
                          <span style={{ color: "var(--text-muted)" }}>None.</span>
                        ) : (
                          previewData.aggregatedMaterials.map((m: any) => (
                            <span key={m.materialName} style={{ fontSize: "12px" }}>📦 {m.materialName}: {m.totalUsed}</span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>PM Commentary (Executive Summary Notes) *</label>
                <textarea required placeholder="Outline key milestones achieved, address timeline constraints, or explain budget updates..." rows={4} style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "inherit", fontFamily: "inherit" }} value={commentary} onChange={(e) => setCommentary(e.target.value)} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompileOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} disabled={isGenerating}>{isGenerating ? "Compiling..." : "Save & Compile Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details modal */}
      {selectedSummary && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "720px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", maxHeight: "90vh", overflowY: "auto" }} id="printable-area">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>{selectedSummary.summary.project.code} • {selectedSummary.summary.project.location}</span>
                <h4 style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px" }}>{selectedSummary.summary.title}</h4>
                <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Timeline Dates: {new Date(selectedSummary.summary.startDate).toLocaleDateString()} to {new Date(selectedSummary.summary.endDate).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>🖨️ Print / PDF</button>
                <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setSelectedSummary(null)}>&times;</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* PM commentary notes */}
              <div style={{ padding: "16px", backgroundColor: "rgba(59,130,246,0.05)", borderLeft: "4px solid var(--accent)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>PM Commentary</span>
                <p style={{ fontSize: "14px", fontStyle: "italic", marginTop: "6px", color: "white", lineHeight: "1.5" }}>
                  "{selectedSummary.summary.commentary}"
                </p>
              </div>

              {/* Materials totals */}
              {selectedSummary.details.aggregatedMaterials.length > 0 && (
                <div>
                  <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>Total Material Usage In Window</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    {selectedSummary.details.aggregatedMaterials.map((m: any) => (
                      <div key={m.materialName} style={{ padding: "10px 14px", backgroundColor: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)" }}>{m.materialName}</span>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px", display: "block" }}>{m.totalUsed}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work log summary */}
              <div>
                <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>Aggregated Work Logs ({selectedSummary.details.daysCount} Days Logged)</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedSummary.details.workCompletedLogs.map((log: any, idx: number) => (
                    <div key={idx} style={{ padding: "12px", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 600 }}>
                        <span>📅 {log.date} ({log.weather || "Weather N/A"})</span>
                        <span>Logged by {log.submitter}</span>
                      </div>
                      <p style={{ marginTop: "6px", color: "var(--text-primary)", lineHeight: "1.5" }}>{log.workCompleted}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues aggregate */}
              {selectedSummary.details.issuesLogs.length > 0 && (
                <div>
                  <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--error)", textTransform: "uppercase", marginBottom: "8px" }}>Aggregated Issues Faced</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedSummary.details.issuesLogs.map((log: any, idx: number) => (
                      <div key={idx} style={{ padding: "10px", backgroundColor: "rgba(239,68,68,0.05)", borderLeft: "3px solid var(--error)", fontSize: "13px", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--error)", fontSize: "11px", fontWeight: 600 }}>
                          <span>📅 {log.date}</span>
                          <span>Logged by {log.submitter}</span>
                        </div>
                        <p style={{ marginTop: "4px", color: "var(--text-secondary)" }}>{log.issuesFaced}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MaterialUsage {
  id: string;
  materialName: string;
  quantityUsed: number;
}

interface Photo {
  id: string;
  fileUrl: string;
  caption: string | null;
}

interface DailyReport {
  id: string;
  reportDate: string;
  workCompleted: string;
  issuesFaced: string | null;
  weather: string | null;
  isApproved: boolean;
  approvedBy: string | null;
  project: { id: string; name: string; code: string };
  submitter: { firstName: string; lastName: string };
  materialUsage: MaterialUsage[];
  photos: Photo[];
}

interface Project {
  id: string;
  name: string;
  code: string;
  materials: Array<{
    material: {
      id: string;
      name: string;
      unit: string;
    };
  }>;
}

interface ReportsDashboardProps {
  initialReports: DailyReport[];
  projects: Project[];
  currentUser: { id: string; role: string; firstName: string; lastName: string };
}

interface EquipmentLogRow {
  description: string;
  stationFrom: string;
  stationTo: string;
  equipmentTypeId: string;
  machineryCode: string;
  unitId: string;
  executedAmount: string;
  workingHour: string;
  idleHour: string;
  downHour: string;
  idleReason: string;
  downReason: string;
  remark: string;
}

interface ManpowerLogRow {
  jobTitleId: string;
  quantity: string;
  manHour: string;
}

interface MasterData {
  activities: Array<{ id: string; name: string }>;
  equipmentTypes: Array<{ id: string; name: string; machines: Array<{ id: string; code: string }> }>;
  units: Array<{ id: string; name: string }>;
  jobTitles: Array<{ id: string; name: string }>;
  idleReasons: Array<{ id: string; name: string }>;
  downReasons: Array<{ id: string; name: string }>;
  personnel: Array<{ id: string; name: string; role: string | null }>;
}

export default function ReportsDashboard({
  initialReports,
  projects,
  currentUser,
}: ReportsDashboardProps) {
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>(initialReports);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Master Data State
  const [masterData, setMasterData] = useState<MasterData | null>(null);

  useEffect(() => {
    fetch("/api/reports/master-data")
      .then((res) => res.json())
      .then((data) => setMasterData(data))
      .catch((err) => console.error("Failed to load master data:", err));
  }, []);

  // Form State
  const [reportProjId, setReportProjId] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [lotSection, setLotSection] = useState("");
  const [activityId, setActivityId] = useState("");
  const [crewNo, setCrewNo] = useState("");
  const [crewLeader, setCrewLeader] = useState("");

  const [weather, setWeather] = useState("");
  const [issuesFaced, setIssuesFaced] = useState("");

  // Equipment Log State
  const [equipmentLog, setEquipmentLog] = useState<EquipmentLogRow[]>([
    {
      description: "",
      stationFrom: "",
      stationTo: "",
      equipmentTypeId: "",
      machineryCode: "",
      unitId: "",
      executedAmount: "",
      workingHour: "",
      idleHour: "",
      downHour: "",
      idleReason: "",
      downReason: "",
      remark: "",
    },
  ]);

  // Manpower Log State
  const [manpowerLog, setManpowerLog] = useState<ManpowerLogRow[]>([
    { jobTitleId: "", quantity: "", manHour: "" },
  ]);

  // Materials tracking during logging
  const [selectedMatId, setSelectedMatId] = useState("");
  const [selectedMatQty, setSelectedMatQty] = useState("");
  const [consumedMaterials, setConsumedMaterials] = useState<Array<{ id: string; name: string; quantity: number }>>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Office Engineer — cost & profit encoding (spec §4)
  const [dailyCost, setDailyCost] = useState("");
  const [dailyProfit, setDailyProfit] = useState("");

  // Autosave status
  const [autosaveStatus, setAutosaveStatus] = useState("");

  // Load draft from localStorage on project/date selection
  useEffect(() => {
    if (!reportProjId || !reportDate) return;
    const draftKey = `cms_draft_report_${reportProjId}_${reportDate}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setLotSection(parsed.lotSection || "");
        setActivityId(parsed.activityId || "");
        setCrewNo(parsed.crewNo || "");
        setCrewLeader(parsed.crewLeader || "");
        setWeather(parsed.weather || "");
        setIssuesFaced(parsed.issuesFaced || "");
        if (parsed.equipmentLog) setEquipmentLog(parsed.equipmentLog);
        if (parsed.manpowerLog) setManpowerLog(parsed.manpowerLog);
        if (parsed.consumedMaterials) setConsumedMaterials(parsed.consumedMaterials);
        setAutosaveStatus("Loaded draft from local storage.");
        setTimeout(() => setAutosaveStatus(""), 3000);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, [reportProjId, reportDate]);

  // Periodic Auto-save effect
  useEffect(() => {
    if (!reportProjId || !reportDate || !isSubmitOpen) return;
    const saveInterval = setInterval(() => {
      const draftKey = `cms_draft_report_${reportProjId}_${reportDate}`;
      const draftData = {
        lotSection,
        activityId,
        crewNo,
        crewLeader,
        weather,
        issuesFaced,
        equipmentLog,
        manpowerLog,
        consumedMaterials,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setAutosaveStatus("Autosaved draft...");
      setTimeout(() => setAutosaveStatus(""), 2000);
    }, 10000); // Autosave every 10 seconds

    return () => clearInterval(saveInterval);
  }, [reportProjId, reportDate, lotSection, activityId, crewNo, crewLeader, weather, issuesFaced, equipmentLog, manpowerLog, consumedMaterials, isSubmitOpen]);

  // Determine selectable materials based on project allocation
  const currentProjAllocations = projects.find((p) => p.id === reportProjId)?.materials || [];

  const handleAddMaterialRow = () => {
    if (!selectedMatId || !selectedMatQty) return;
    const targetMat = currentProjAllocations.find((m) => m.material.id === selectedMatId)?.material;
    if (!targetMat) return;

    if (consumedMaterials.some((m) => m.id === selectedMatId)) {
      alert("Material already added to list.");
      return;
    }

    setConsumedMaterials([
      ...consumedMaterials,
      { id: selectedMatId, name: targetMat.name, quantity: parseFloat(selectedMatQty) },
    ]);
    setSelectedMatId("");
    setSelectedMatQty("");
  };

  const handleRemoveMaterialRow = (id: string) => {
    setConsumedMaterials(consumedMaterials.filter((m) => m.id !== id));
  };

  // Equipment actions
  const handleAddEquipmentRow = () => {
    setEquipmentLog([
      ...equipmentLog,
      {
        description: "",
        stationFrom: "",
        stationTo: "",
        equipmentTypeId: "",
        machineryCode: "",
        unitId: "",
        executedAmount: "",
        workingHour: "",
        idleHour: "",
        downHour: "",
        idleReason: "",
        downReason: "",
        remark: "",
      },
    ]);
  };

  const handleRemoveEquipmentRow = (index: number) => {
    setEquipmentLog(equipmentLog.filter((_, i) => i !== index));
  };

  const handleEquipmentChange = (index: number, field: keyof EquipmentLogRow, value: string) => {
    const updated = [...equipmentLog];
    if (field === "equipmentTypeId") {
      // Reset machinery code if type changes
      updated[index].machineryCode = "";
    }
    updated[index] = { ...updated[index], [field]: value };
    setEquipmentLog(updated);
  };

  // Manpower actions
  const handleAddManpowerRow = () => {
    setManpowerLog([...manpowerLog, { jobTitleId: "", quantity: "", manHour: "" }]);
  };

  const handleRemoveManpowerRow = (index: number) => {
    setManpowerLog(manpowerLog.filter((_, i) => i !== index));
  };

  const handleManpowerChange = (index: number, field: keyof ManpowerLogRow, value: string) => {
    const updated = [...manpowerLog];
    updated[index] = { ...updated[index], [field]: value };
    setManpowerLog(updated);
  };

  // Final Form Submissions
  const validateForm = () => {
    if (!reportProjId || !reportDate || !activityId) {
      alert("Please fill out all required fields in the Header.");
      return false;
    }

    if (new Date(reportDate) > new Date()) {
      alert("Report date cannot be in the future.");
      return false;
    }

    // Equipment validation
    for (let i = 0; i < equipmentLog.length; i++) {
      const row = equipmentLog[i];
      if (!row.equipmentTypeId) continue;
      const working = parseFloat(row.workingHour) || 0;
      const idle = parseFloat(row.idleHour) || 0;
      const down = parseFloat(row.downHour) || 0;

      if (working + idle + down > 24) {
        alert(`Equipment Row ${i + 1}: Working + Idle + Down hours cannot exceed 24.`);
        return false;
      }

      if (working < 0 || idle < 0 || down < 0) {
        alert(`Equipment Row ${i + 1}: Hours cannot be negative.`);
        return false;
      }

      if (idle > 0 && !row.idleReason.trim()) {
        alert(`Equipment Row ${i + 1}: Idle reason is required when Idle Hours > 0.`);
        return false;
      }

      if (down > 0 && !row.downReason.trim()) {
        alert(`Equipment Row ${i + 1}: Down reason is required when Down Hours > 0.`);
        return false;
      }
    }

    // Manpower validation
    for (let i = 0; i < manpowerLog.length; i++) {
      const row = manpowerLog[i];
      if (!row.jobTitleId) continue;
      const qty = parseInt(row.quantity) || 0;
      const hours = parseFloat(row.manHour) || 0;

      if (qty < 0 || hours < 0 || hours > 24) {
        alert(`Manpower Row ${i + 1}: Quantity/Hours must be positive and Hours <= 24.`);
        return false;
      }
    }

    // Must have at least one Equipment or Manpower record
    const hasEquipment = equipmentLog.some((row) => row.equipmentTypeId);
    const hasManpower = manpowerLog.some((row) => row.jobTitleId);

    if (!hasEquipment && !hasManpower) {
      alert("You must log at least one Equipment Type or one Job Title.");
      return false;
    }

    return true;
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    // Structure the full QC Report inside workCompleted as a JSON payload
    const structuredWorkCompleted = JSON.stringify({
      lotSection,
      activityId,
      crewNo,
      crewLeader,
      equipmentLog: equipmentLog.filter((r) => r.equipmentTypeId),
      manpowerLog: manpowerLog.filter((r) => r.jobTitleId),
    });

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: reportProjId,
          reportDate,
          workCompleted: structuredWorkCompleted,
          issuesFaced: issuesFaced || null,
          weather: weather || null,
          materials: consumedMaterials.map((m) => ({ materialId: m.id, quantityUsed: m.quantity })),
          ...(currentUser.role === "OFFICE_ENGINEER" && dailyCost ? { dailyCost: parseFloat(dailyCost) } : {}),
          ...(currentUser.role === "OFFICE_ENGINEER" && dailyProfit ? { dailyProfit: parseFloat(dailyProfit) } : {}),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Clear autosave draft
        const draftKey = `cms_draft_report_${reportProjId}_${reportDate}`;
        localStorage.removeItem(draftKey);

        const refreshRes = await fetch("/api/reports");
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) {
          setReports(refreshData.reports);
        }

        // Reset
        setReportProjId("");
        setLotSection("");
        setActivityId("");
        setCrewNo("");
        setCrewLeader("");
        setWeather("");
        setIssuesFaced("");
        setEquipmentLog([{
          description: "", stationFrom: "", stationTo: "", equipmentTypeId: "",
          machineryCode: "", unitId: "", executedAmount: "", workingHour: "",
          idleHour: "", downHour: "", idleReason: "", downReason: "", remark: ""
        }]);
        setManpowerLog([{ jobTitleId: "", quantity: "", manHour: "" }]);
        setConsumedMaterials([]);
        setIsSubmitOpen(false);
        setCurrentStep(1);
        router.refresh();
      } else {
        alert(data.error || "Failed to submit daily report.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setReports(
          reports.map((r) =>
            r.id === reportId ? { ...r, isApproved: true, approvedBy: data.report.approvedBy } : r
          )
        );
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper parser for custom QC layout
  const renderQCParsedReport = (report: DailyReport) => {
    let parsed: any = null;
    try {
      if (report.workCompleted.startsWith("{")) {
        parsed = JSON.parse(report.workCompleted);
      }
    } catch (e) {
      parsed = null;
    }

    if (!parsed) {
      return (
        <div>
          <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Work Completed</span>
          <p style={{ fontSize: "14px", marginTop: "4px", lineHeight: "1.5" }}>{report.workCompleted}</p>
        </div>
      );
    }

    const activityName = masterData?.activities.find((a) => a.id === parsed.activityId)?.name || parsed.activityId;
    const leaderName = masterData?.personnel.find((p) => p.id === parsed.crewLeader)?.name || parsed.crewLeader;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", overflowX: "auto" }}>
        {/* QC Header Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", padding: "12px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)" }}>
          <div>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Activity</span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{activityName}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Lot / Section</span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{parsed.lotSection || "N/A"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>QC / Crew No.</span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{parsed.crewNo || "N/A"}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase" }}>QC / Crew Leader</span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{leaderName || "N/A"}</span>
          </div>
        </div>

        {/* Equipment Log Table */}
        {parsed.equipmentLog && parsed.equipmentLog.length > 0 && (
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", color: "var(--accent)" }}>🚜 Equipment Log</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "6px" }}>S/N</th>
                  <th style={{ padding: "6px" }}>Type</th>
                  <th style={{ padding: "6px" }}>Code</th>
                  <th style={{ padding: "6px" }}>Work Output</th>
                  <th style={{ padding: "6px" }}>Hrs (W / I / D)</th>
                  <th style={{ padding: "6px" }}>Station Range</th>
                  <th style={{ padding: "6px" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {parsed.equipmentLog.map((eq: any, i: number) => {
                  const typeName = masterData?.equipmentTypes.find((t) => t.id === eq.equipmentTypeId)?.name || eq.equipmentTypeId;
                  const unitName = masterData?.units.find((u) => u.id === eq.unitId)?.name || eq.unitId;

                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px" }}>{i + 1}</td>
                      <td style={{ padding: "6px" }}>{typeName}</td>
                      <td style={{ padding: "6px" }}>{eq.machineryCode}</td>
                      <td style={{ padding: "6px" }}>{eq.executedAmount || "-"} {unitName}</td>
                      <td style={{ padding: "6px" }}>
                        <span>{eq.workingHour || 0}h / {eq.idleHour || 0}h / {eq.downHour || 0}h</span>
                        {parseFloat(eq.idleHour) > 0 && <div style={{ fontSize: "10px", color: "var(--warning)" }}>Idle: {eq.idleReason}</div>}
                        {parseFloat(eq.downHour) > 0 && <div style={{ fontSize: "10px", color: "var(--error)" }}>Down: {eq.downReason}</div>}
                      </td>
                      <td style={{ padding: "6px" }}>{eq.stationFrom && eq.stationTo ? `${eq.stationFrom} - ${eq.stationTo}` : "N/A"}</td>
                      <td style={{ padding: "6px", color: "var(--text-secondary)", fontStyle: "italic" }}>{eq.remark || eq.description || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Manpower Log Table */}
        {parsed.manpowerLog && parsed.manpowerLog.length > 0 && (
          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", color: "var(--accent)" }}>👥 Manpower Log</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "6px" }}>S/N</th>
                  <th style={{ padding: "6px" }}>Job Title</th>
                  <th style={{ padding: "6px" }}>Headcount</th>
                  <th style={{ padding: "6px" }}>Man-Hours</th>
                </tr>
              </thead>
              <tbody>
                {parsed.manpowerLog.map((man: any, i: number) => {
                  const jobName = masterData?.jobTitles.find((j) => j.id === man.jobTitleId)?.name || man.jobTitleId;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px" }}>{i + 1}</td>
                      <td style={{ padding: "6px" }}>{jobName}</td>
                      <td style={{ padding: "6px" }}>{man.quantity}</td>
                      <td style={{ padding: "6px" }}>{man.manHour}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Daily Site Reports</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Submit and review daily logs, equipment & manpower tables, weather conditions, and material allocations.
          </p>
        </div>
        {currentUser.role === "OFFICE_ENGINEER" && (
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="btn btn-primary"
            style={{ backgroundColor: "var(--accent)", border: "none" }}
          >
            📝 Log Daily Report
          </button>
        )}
      </div>

      {/* Reports Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {reports.length === 0 ? (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            No daily logs submitted yet.
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>
                    {report.project.code} - {report.project.name}
                  </span>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>
                    Daily Log for {new Date(report.reportDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Submitted by {report.submitter.firstName} {report.submitter.lastName}
                  </div>
                </div>
                <div>
                  {report.isApproved ? (
                    <span style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "var(--radius-sm)", backgroundColor: "rgba(34,197,94,0.15)", color: "var(--success)" }}>
                      ✅ APPROVED BY {report.approvedBy?.toUpperCase()}
                    </span>
                  ) : (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "var(--radius-sm)", backgroundColor: "rgba(234,179,8,0.15)", color: "var(--warning)" }}>
                        ⏳ PENDING APPROVAL
                      </span>
                      {currentUser.role === "PROJECT_MANAGER" && (
                        <button
                          onClick={() => handleApproveReport(report.id)}
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", fontSize: "11px", backgroundColor: "var(--success)", border: "none" }}
                        >
                          Approve Report
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Weather & Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {report.weather && (
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Weather Condition</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>☀️ {report.weather}</span>
                    </div>
                  )}
                  {report.materialUsage.length > 0 && (
                    <div>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Material Usage</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {report.materialUsage.map((u) => (
                          <span key={u.id} style={{ fontSize: "12px", color: "white" }}>
                            📦 {u.materialName}: {u.quantityUsed}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {renderQCParsedReport(report)}
                  {report.issuesFaced && (
                    <div style={{ marginTop: "16px", padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(239,68,68,0.05)", borderLeft: "3px solid var(--error)" }}>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--error)", fontWeight: 700, textTransform: "uppercase" }}>Issues Encountered</span>
                      <p style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-secondary)" }}>{report.issuesFaced}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Daily Report Wizard Modal */}
      {isSubmitOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "800px", padding: "32px", margin: "auto", backgroundColor: "var(--bg-surface)", maxHeight: "90vh", overflowY: "auto", color: "var(--text-primary)" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h4 style={{ fontSize: "18px", fontWeight: 700 }}>Log Daily QC Site Report</h4>
                {autosaveStatus && <span style={{ fontSize: "11px", color: "var(--accent)" }}>{autosaveStatus}</span>}
              </div>
              <button style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setIsSubmitOpen(false)}>&times;</button>
            </div>

            {/* Wizard Steps indicator */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              {[
                { step: 1, label: "Header" },
                { step: 2, label: "Equipment Log" },
                { step: 3, label: "Manpower Log & Submit" }
              ].map((s) => (
                <div key={s.step} style={{ flex: 1, textAlign: "center", borderBottom: `3px solid ${currentStep === s.step ? "var(--accent)" : "var(--border)"}`, paddingBottom: "8px", fontWeight: currentStep === s.step ? 700 : 400, color: currentStep === s.step ? "var(--text-primary)" : "var(--text-secondary)", fontSize: "12px" }}>
                  Step {s.step}: {s.label}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmitReport} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* STEP 1: HEADER FIELDS */}
              {currentStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Project *</label>
                      <select required style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={reportProjId} onChange={(e) => setReportProjId(e.target.value)}>
                        <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select project...</option>
                        {projects.map((p) => <option key={p.id} value={p.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{p.code} - {p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Date *</label>
                      <input type="date" required max={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "8px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Activity *</label>
                      <select required style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                        <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select activity...</option>
                        {masterData?.activities.map((a) => <option key={a.id} value={a.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Lot / Section</label>
                      <input type="text" placeholder="e.g. Lot 3B" style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={lotSection} onChange={(e) => setLotSection(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>QC / Crew No.</label>
                      <input type="text" placeholder="e.g. CRW-09" style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={crewNo} onChange={(e) => setCrewNo(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>QC / Crew Leader</label>
                      <select style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={crewLeader} onChange={(e) => setCrewLeader(e.target.value)}>
                        <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select Crew Leader...</option>
                        {masterData?.personnel.map((p) => <option key={p.id} value={p.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{p.name} ({p.role || "Staff"})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Weather Conditions</label>
                      <input type="text" placeholder="e.g. Sunny, 78°F" style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} value={weather} onChange={(e) => setWeather(e.target.value)} />
                    </div>
                  </div>

                  {reportProjId && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase" }}>Project Material Consumption</label>
                      {currentProjAllocations.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No materials currently allocated to this project.</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                            <div style={{ flex: 2 }}>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Material Name</label>
                              <select style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={selectedMatId} onChange={(e) => setSelectedMatId(e.target.value)}>
                                <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select allocation...</option>
                                {currentProjAllocations.map((m) => (
                                  <option key={m.material.id} value={m.material.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{m.material.name} ({m.material.unit})</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Quantity Used</label>
                              <input type="number" step="any" placeholder="0" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={selectedMatQty} onChange={(e) => setSelectedMatQty(e.target.value)} />
                            </div>
                            <button type="button" onClick={handleAddMaterialRow} className="btn btn-secondary" style={{ padding: "8px 16px" }}>Add</button>
                          </div>
                          {consumedMaterials.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "var(--bg-base)", padding: "10px", borderRadius: "var(--radius-sm)" }}>
                              {consumedMaterials.map((m) => (
                                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                                  <span>📦 {m.name}: {m.quantity}</span>
                                  <button type="button" onClick={() => handleRemoveMaterialRow(m.id)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer" }}>Remove</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: EQUIPMENT LOG */}
              {currentStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700 }}>🚜 Equipment & Machinery Log</h4>
                    <button type="button" onClick={handleAddEquipmentRow} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "11px" }}>+ Add Equipment</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {equipmentLog.map((row, index) => {
                      const selectedType = masterData?.equipmentTypes.find((t) => t.id === row.equipmentTypeId);
                      const machineOptions = selectedType?.machines || [];

                      return (
                        <div key={index} style={{ padding: "16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
                          {equipmentLog.length > 1 && (
                            <button type="button" onClick={() => handleRemoveEquipmentRow(index)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: "16px" }}>&times;</button>
                          )}
                          <div style={{ display: "flex", gap: "8px", fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                            S/N {index + 1}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Equip. Type *</label>
                              <select style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.equipmentTypeId} onChange={(e) => handleEquipmentChange(index, "equipmentTypeId", e.target.value)}>
                                <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select type...</option>
                                {masterData?.equipmentTypes.map((t) => <option key={t.id} value={t.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{t.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Machinery Code *</label>
                              <select style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.machineryCode} onChange={(e) => handleEquipmentChange(index, "machineryCode", e.target.value)} disabled={!row.equipmentTypeId}>
                                <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select code...</option>
                                {machineOptions.map((m) => <option key={m.id} value={m.code} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{m.code}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Unit *</label>
                              <select style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.unitId} onChange={(e) => handleEquipmentChange(index, "unitId", e.target.value)}>
                                <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select unit...</option>
                                {masterData?.units.map((u) => <option key={u.id} value={u.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{u.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Work Output *</label>
                              <input type="text" placeholder="e.g. 150 (fill space)" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.executedAmount} onChange={(e) => handleEquipmentChange(index, "executedAmount", e.target.value)} />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Working Hours *</label>
                              <input type="number" step="any" min="0" max="24" placeholder="0.0" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.workingHour} onChange={(e) => handleEquipmentChange(index, "workingHour", e.target.value)} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Idle Hours *</label>
                              <input type="number" step="any" min="0" max="24" placeholder="0.0" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.idleHour} onChange={(e) => handleEquipmentChange(index, "idleHour", e.target.value)} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Down Hours *</label>
                              <input type="number" step="any" min="0" max="24" placeholder="0.0" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.downHour} onChange={(e) => handleEquipmentChange(index, "downHour", e.target.value)} />
                            </div>
                          </div>

                          {/* Free text Idle Reason */}
                          {parseFloat(row.idleHour) > 0 && (
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Idle Reason *</label>
                              <input type="text" required placeholder="Specify reason (blank space)" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.idleReason} onChange={(e) => handleEquipmentChange(index, "idleReason", e.target.value)} />
                            </div>
                          )}

                          {/* Free text Down Reason */}
                          {parseFloat(row.downHour) > 0 && (
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Down Reason *</label>
                              <input type="text" required placeholder="Specify reason (blank space)" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.downReason} onChange={(e) => handleEquipmentChange(index, "downReason", e.target.value)} />
                            </div>
                          )}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Station From</label>
                              <input type="text" placeholder="e.g. 10+200" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.stationFrom} onChange={(e) => handleEquipmentChange(index, "stationFrom", e.target.value)} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Station To</label>
                              <input type="text" placeholder="e.g. 10+500" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.stationTo} onChange={(e) => handleEquipmentChange(index, "stationTo", e.target.value)} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Remark</label>
                              <input type="text" placeholder="Optional notes" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.remark} onChange={(e) => handleEquipmentChange(index, "remark", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: MANPOWER LOG & Issues Faced */}
              {currentStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700 }}>👥 Manpower Log</h4>
                    <button type="button" onClick={handleAddManpowerRow} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "11px" }}>+ Add Manpower</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {manpowerLog.map((row, index) => (
                      <div key={index} style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", gap: "12px", alignItems: "flex-end", position: "relative" }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Job Title *</label>
                          <select style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.jobTitleId} onChange={(e) => handleManpowerChange(index, "jobTitleId", e.target.value)}>
                            <option value="" style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>Select role...</option>
                            {masterData?.jobTitles.map((j) => <option key={j.id} value={j.id} style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}>{j.name}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Quantity *</label>
                          <input type="number" min="0" placeholder="0" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.quantity} onChange={(e) => handleManpowerChange(index, "quantity", e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Man-Hour *</label>
                          <input type="number" step="any" min="0" max="24" placeholder="0.0" style={{ width: "100%", padding: "7px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={row.manHour} onChange={(e) => handleManpowerChange(index, "manHour", e.target.value)} />
                        </div>
                        {manpowerLog.length > 1 && (
                          <button type="button" onClick={() => handleRemoveManpowerRow(index)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", fontSize: "18px", paddingBottom: "6px" }}>&times;</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Issues Faced</label>
                    <textarea placeholder="e.g. weather delays, machinery breakdown..." rows={3} style={{ width: "100%", padding: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "inherit" }} value={issuesFaced} onChange={(e) => setIssuesFaced(e.target.value)} />
                  </div>

                  {/* Office Engineer cost & profit encoding */}
                  {currentUser.role === "OFFICE_ENGINEER" && (
                    <div style={{ marginTop: "8px", padding: "20px", borderRadius: "var(--radius-sm)", border: "2px solid var(--accent)", background: "rgba(99,102,241,0.05)" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", marginBottom: "14px" }}>💰 Daily Cost & Profit Encoding <span style={{ fontSize: "10px", opacity: 0.7 }}>(Office Engineer only)</span></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Daily Cost (₱)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                            value={dailyCost}
                            onChange={(e) => setDailyCost(e.target.value)}
                          />
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>Total cost incurred today</div>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Profit / Revenue (₱)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            style={{ width: "100%", padding: "8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                            value={dailyProfit}
                            onChange={(e) => setDailyProfit(e.target.value)}
                          />
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>Earned revenue / billing today</div>
                        </div>
                        <div style={{ padding: "12px", background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: `1px solid ${ (parseFloat(dailyProfit) || 0) - (parseFloat(dailyCost) || 0) >= 0 ? "var(--success)" : "var(--error)" }` }}>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Net P&L</div>
                          <div style={{ fontSize: "20px", fontWeight: 800, color: (parseFloat(dailyProfit) || 0) - (parseFloat(dailyCost) || 0) >= 0 ? "var(--success)" : "var(--error)" }}>
                            {((parseFloat(dailyProfit) || 0) - (parseFloat(dailyCost) || 0)).toLocaleString("en-US", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{(parseFloat(dailyProfit) || 0) - (parseFloat(dailyCost) || 0) >= 0 ? "✅ Profitable" : "🔴 In the red"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Wizard Footer Navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <div>
                  {currentStep > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>Back</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsSubmitOpen(false)}>Cancel</button>
                  {currentStep < 3 ? (
                    <button type="button" className="btn btn-primary" style={{ backgroundColor: "var(--accent)", border: "none" }} onClick={() => setCurrentStep(currentStep + 1)}>Next</button>
                  ) : (
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--success)", border: "none" }} disabled={isLoading}>{isLoading ? "Submitting..." : "Submit Log"}</button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

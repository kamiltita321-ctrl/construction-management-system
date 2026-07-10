"use client";

import { useState, useCallback, useRef } from "react";

interface ParsedSchedule {
  wbs: any[];
  resources: any[];
  budget: any[];
}

interface ScheduleUploaderProps {
  projectId: string;
  initialSchedule?: {
    fileName: string;
    parsedWbs: any;
    parsedResources: any;
    parsedBudget: any;
    uploadedBy: string;
    updatedAt: string;
  } | null;
}

export default function ScheduleUploader({ projectId, initialSchedule }: ScheduleUploaderProps) {
  const [activeSegment, setActiveSegment] = useState<"wbs" | "resources" | "budget">("wbs");
  const [schedule, setSchedule] = useState<ParsedSchedule | null>(
    initialSchedule
      ? {
          wbs: initialSchedule.parsedWbs as any[],
          resources: initialSchedule.parsedResources as any[],
          budget: initialSchedule.parsedBudget as any[],
        }
      : null
  );
  const [fileName, setFileName] = useState(initialSchedule?.fileName || "");
  const [uploadedBy, setUploadedBy] = useState(initialSchedule?.uploadedBy || "");
  const [lastUpdated, setLastUpdated] = useState(initialSchedule?.updatedAt || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcel = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Dynamic import of xlsx to avoid SSR issues
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const sheetNames = workbook.SheetNames;

      // Try to detect WBS, Resources, Budget sheets by name (case-insensitive)
      const findSheet = (keywords: string[]) => {
        const name = sheetNames.find((s) =>
          keywords.some((k) => s.toLowerCase().includes(k.toLowerCase()))
        );
        return name ? workbook.Sheets[name] : workbook.Sheets[sheetNames[0]];
      };

      const wbsSheet = findSheet(["wbs", "work breakdown", "schedule"]);
      const resourceSheet = findSheet(["resource", "manpower", "crew"]);
      const budgetSheet = findSheet(["budget", "cost", "finance"]);

      const toJson = (sheet: any) => {
        if (!sheet) return [];
        return XLSX.utils.sheet_to_json(sheet, { defval: "" });
      };

      const parsed: ParsedSchedule = {
        wbs: toJson(wbsSheet),
        resources: toJson(resourceSheet || wbsSheet),
        budget: toJson(budgetSheet || wbsSheet),
      };

      setSchedule(parsed);
      setFileName(file.name);

      // Save to database
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          parsedWbs: parsed.wbs,
          parsedResources: parsed.resources,
          parsedBudget: parsed.budget,
        }),
      });
      const data = await res.json();
      if (res.ok && data.schedule) {
        setUploadedBy(data.schedule.uploadedBy || "");
        setLastUpdated(data.schedule.updatedAt || new Date().toISOString());
      }
    } catch (err: any) {
      console.error("Schedule parse error:", err);
      setError("Failed to parse the Excel file. Make sure it's a valid .xlsx file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|ods|csv)$/i)) {
      setError("Please upload an Excel file (.xlsx, .xls) or .csv");
      return;
    }
    parseExcel(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [projectId]
  );

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) {
      return <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No data in this segment.</p>;
    }
    const headers = Object.keys(data[0]);
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              {headers.map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap", backgroundColor: "var(--bg-base)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                {headers.map((h) => (
                  <td key={h} style={{ padding: "8px 12px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius-md)",
          padding: "40px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          backgroundColor: isDragging ? "rgba(99,102,241,0.05)" : "var(--bg-base)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.ods,.csv"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
        {isProcessing ? (
          <div style={{ color: "var(--accent)", fontWeight: 700 }}>Parsing Excel file...</div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>
              {schedule ? "📁 Re-upload / Update Schedule" : "Upload Master Schedule (.xlsx)"}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
              Drag & drop your Excel schedule file here, or click to browse.<br />
              Sheets will be parsed into WBS, Resource, and Budget segments.
            </p>
            {schedule && (
              <div style={{ marginTop: "12px", padding: "8px 16px", borderRadius: "var(--radius-sm)", background: "rgba(34,197,94,0.1)", border: "1px solid var(--success)", display: "inline-block", fontSize: "12px", color: "var(--success)" }}>
                ✅ Current: <strong>{fileName}</strong>
                {uploadedBy && <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>by {uploadedBy}</span>}
                {lastUpdated && <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>· {new Date(lastUpdated).toLocaleDateString()}</span>}
              </div>
            )}
          </>
        )}
        {error && (
          <div style={{ marginTop: "12px", color: "var(--error)", fontSize: "13px" }}>❌ {error}</div>
        )}
      </div>

      {/* Schedule Data Panels */}
      {schedule && (
        <section className="glass-panel" style={{ padding: "24px" }}>
          {/* Segment Tabs */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid var(--border)" }}>
            {(["wbs", "resources", "budget"] as const).map((seg) => (
              <button
                key={seg}
                onClick={() => setActiveSegment(seg)}
                style={{
                  padding: "8px 18px",
                  background: "none",
                  border: "none",
                  borderBottom: activeSegment === seg ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: "-2px",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: activeSegment === seg ? "var(--accent)" : "var(--text-secondary)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  transition: "all 0.15s",
                }}
              >
                {seg === "wbs" ? "📋 WBS" : seg === "resources" ? "👷 Resources" : "💰 Budget"}
              </button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)", alignSelf: "center" }}>
              {schedule[activeSegment]?.length ?? 0} rows
            </span>
          </div>

          {/* Table */}
          {renderTable(schedule[activeSegment])}
        </section>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  confidentialityLevel?: number;
  referenceNumber?: string | null;
  documentDate?: string | null;
}

interface ProjectDocumentsProps {
  projectId: string;
  initialDocuments: Document[];
  defaultFileType?: string;
  canUpload?: boolean;
}

const FILE_CATEGORIES = [
  { type: "ALL",      label: "All Files",            icon: "📁" },
  { type: "DRAWING",  label: "Drawings",              icon: "📐" },
  { type: "IMAGE",    label: "Photos",                icon: "📷" },
  { type: "CONTRACT", label: "Contracts",             icon: "📄" },
  { type: "REPORT",   label: "Report Attachments",    icon: "📝" },
  { type: "PDF",      label: "PDF References",        icon: "📕" },
];

const fileIcon = (type: string) => {
  switch (type) {
    case "DRAWING":  return "📐";
    case "IMAGE":    return "📷";
    case "CONTRACT": return "📄";
    case "REPORT":   return "📝";
    case "PDF":      return "📕";
    default:         return "📁";
  }
};

export default function ProjectDocuments({
  projectId,
  initialDocuments,
  defaultFileType = "DRAWING",
  canUpload = true,
}: ProjectDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState(defaultFileType);
  const [file, setFile] = useState<File | null>(null);
  const [confidentialityLevel, setConfidentialityLevel] = useState(3);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      if (!title) {
        const nameWithoutExt = e.target.files[0].name.split(".").slice(0, -1).join(".");
        setTitle(nameWithoutExt || e.target.files[0].name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !fileType) {
      setMessage({ type: "error", text: "Please provide a file, title, and category." });
      return;
    }
    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("fileType", fileType);
      formData.append("projectId", projectId);
      formData.append("confidentialityLevel", String(confidentialityLevel));
      if (referenceNumber) formData.append("referenceNumber", referenceNumber);
      if (documentDate) formData.append("documentDate", documentDate);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "File uploaded successfully!" });
        setTitle("");
        setFile(null);
        setReferenceNumber("");
        setDocumentDate("");
        const fileInput = document.getElementById("doc-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        setDocuments([data.document, ...documents]);
        setActiveCategory(fileType);
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to upload file." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "An error occurred during upload." });
    } finally {
      setIsUploading(false);
    }
  };

  const filtered = activeCategory === "ALL"
    ? documents
    : documents.filter(d => d.fileType === activeCategory);

  const levelFiltered = activeLevel === null ? filtered : filtered.filter(d => (d.confidentialityLevel ?? 3) === activeLevel);

  const countFor = (type: string) =>
    type === "ALL" ? documents.length : documents.filter(d => d.fileType === type).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ fontSize: "16px", fontWeight: 700 }}>Project Documents & Files</h4>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Upload drawings, photos, contracts, and reports. Files are displayed by category.
          </p>
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
          {documents.length} file{documents.length !== 1 ? "s" : ""} total
        </span>
      </div>

      {canUpload && (
        <form
          onSubmit={handleSubmit}
          className="glass-panel"
          style={{ padding: "20px", border: "1px dashed var(--border)", marginBottom: "32px" }}
        >
          <span style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--accent)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📤 Upload New File
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label htmlFor="doc-title" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>File Title *</label>
                <input id="doc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Foundation Blueprint Rev.2" style={{ width: "100%", padding: "8px 12px" }} required />
              </div>
              <div>
                <label htmlFor="doc-type" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Category *</label>
                <select id="doc-type" value={fileType} onChange={(e) => setFileType(e.target.value)} style={{ width: "100%", padding: "8px 12px" }}>
                  <option value="DRAWING">📐 Structural Drawing</option>
                  <option value="IMAGE">📷 Site Photo / Image</option>
                  <option value="CONTRACT">📄 Contract Document</option>
                  <option value="REPORT">📝 Report Attachment</option>
                  <option value="PDF">📕 PDF Reference</option>
                </select>
              </div>
              <div>
                <label htmlFor="doc-ref" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Reference Number</label>
                <input id="doc-ref" type="text" placeholder="e.g. DWG-001-REV2" style={{ width: "100%", padding: "8px 12px" }} value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </div>
              <div>
                <label htmlFor="doc-date" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Document Date</label>
                <input id="doc-date" type="date" style={{ width: "100%", padding: "8px 12px" }} value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="doc-level" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Confidentiality Level *</label>
                <select id="doc-level" value={confidentialityLevel} onChange={(e) => setConfidentialityLevel(parseInt(e.target.value))} style={{ width: "100%", padding: "8px 12px" }}>
                  <option value={3}>🟢 Level 3 — Shared (all team members)</option>
                  <option value={2}>🟡 Level 2 — Restricted (PM and above)</option>
                  <option value={1}>🔴 Level 1 — Confidential (Head Office only)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="doc-file-input" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Select File *
              </label>
              <input
                id="doc-file-input" type="file"
                onChange={handleFileChange}
                style={{ fontSize: "13px" }}
                required
              />
            </div>

            {message && (
              <div style={{ fontSize: "13px", fontWeight: 500, color: message.type === "success" ? "var(--success)" : "var(--error)" }}>
                {message.type === "success" ? "✅" : "❌"} {message.text}
              </div>
            )}

            <div>
              <button
                type="submit" disabled={isUploading}
                className="btn btn-primary"
                style={{ background: "var(--accent)", border: "none", padding: "9px 20px", fontWeight: 600, opacity: isUploading ? 0.6 : 1 }}
              >
                {isUploading ? "Uploading..." : "📤 Upload File"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Category filter tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
        {FILE_CATEGORIES.map(cat => {
          const count = countFor(cat.type);
          return (
            <button
              key={cat.type}
              onClick={() => setActiveCategory(cat.type)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                border: "1px solid",
                borderColor: activeCategory === cat.type ? "var(--accent)" : "var(--border)",
                background: activeCategory === cat.type ? "var(--accent)" : "transparent",
                color: activeCategory === cat.type ? "white" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              {cat.icon} {cat.label}
              <span style={{
                backgroundColor: activeCategory === cat.type ? "rgba(255,255,255,0.25)" : "var(--bg-base)",
                color: activeCategory === cat.type ? "white" : "var(--text-muted)",
                borderRadius: "var(--radius-full)",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* File list / Photo grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>
            {FILE_CATEGORIES.find(c => c.type === activeCategory)?.icon ?? "📁"}
          </div>
          <p style={{ fontSize: "13px" }}>
            No {activeCategory === "ALL" ? "files" : FILE_CATEGORIES.find(c => c.type === activeCategory)?.label.toLowerCase()} uploaded yet.
          </p>
        </div>
      ) : activeCategory === "IMAGE" ? (
        /* Photo grid for images */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="glass-panel"
              style={{ overflow: "hidden", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column" }}
            >
              <div style={{ height: "160px", backgroundColor: "var(--bg-base)", overflow: "hidden", position: "relative" }}>
                <img
                  src={doc.fileUrl} alt={doc.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div style={{ padding: "10px 12px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: "6px", fontSize: "11px", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                  View Full →
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Standard list for other file types */
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-base)", border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "26px" }}>{fileIcon(doc.fileType)}</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{doc.title}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    <span style={{
                      display: "inline-block", padding: "1px 7px", borderRadius: "var(--radius-full)",
                      background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                      fontSize: "10px", marginRight: "8px", textTransform: "uppercase",
                    }}>
                      {doc.fileType}
                    </span>
                    By {doc.uploadedBy} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <a
                href={doc.fileUrl} download target="_blank" rel="noreferrer"
                style={{
                  padding: "7px 14px", borderRadius: "var(--radius-sm)",
                  background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                  fontSize: "12px", fontWeight: 600, color: "var(--text-primary)",
                  textDecoration: "none",
                }}
              >
                📥 Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

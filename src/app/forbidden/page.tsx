import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(circle, #1e293b, #0f172a)",
        color: "#f8fafc",
        fontFamily: "var(--font-sans)",
        textAlign: "center",
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: "480px",
          padding: "40px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
          }}
        >
          ⚠️
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "8px",
            color: "hsl(0, 84%, 60%)",
          }}
        >
          Access Denied
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#94a3b8",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Your account role does not have the required permissions to access this page. Please contact your system administrator if you believe this is in error.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

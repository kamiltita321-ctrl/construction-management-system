"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
}

export default function NotificationBar() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.ok) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll every 30 seconds for dynamic workspace updates
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          fontSize: "20px",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          color: "white",
        }}
        title="View workspace alerts"
      >
        🔔
        {alerts.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "var(--error)",
              color: "white",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: "absolute",
            right: 0,
            top: "35px",
            width: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1000,
            padding: "16px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700 }}>Workspace Alerts</span>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "14px" }}>&times;</button>
          </div>

          {alerts.length === 0 ? (
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", padding: "10px 0" }}>
              No critical alerts or warnings logged.
            </span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    borderLeft: `3px solid ${
                      alert.type === "URGENT_TASK"
                        ? "var(--warning)"
                        : alert.type === "INVENTORY_ALERT"
                        ? "var(--error)"
                        : "var(--accent)"
                    }`,
                    fontSize: "12px",
                  }}
                >
                  <span style={{ display: "block", fontWeight: 700, color: "white" }}>{alert.title}</span>
                  <p style={{ color: "var(--text-secondary)", marginTop: "2px", lineHeight: "1.4" }}>{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

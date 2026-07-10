"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

const DEMO_ACCOUNTS = [
  { role: "System Admin", email: "admin@cms.com", password: "admin123" },
  { role: "General Manager", email: "gm@cms.com", password: "gm123" },
  { role: "Deputy GM", email: "dgm@cms.com", password: "dgm123" },
  { role: "VP of Construction", email: "vp@cms.com", password: "vp123" },
  { role: "Project Manager", email: "pm@cms.com", password: "pm123" },
  { role: "Office Engineer", email: "se@cms.com", password: "se123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccs, setShowDemoAccs] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in.");
      }

      // Login successful, redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAutofill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.logo}>🏗️</div>
          <h1 className={styles.title}>CMS Enterprise</h1>
          <p className={styles.subtitle}>Construction Management System</p>
        </div>

        {error && <div className={styles.alert}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email Address
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary styles.submitBtn"
            style={{ width: "100%", padding: "14px", marginTop: "12px" }}
            disabled={isLoading}
          >
            {isLoading ? "Authenticating..." : "Sign In to Workspace"}
          </button>
        </form>

        <div className={styles.demoSection}>
          <button
            type="button"
            className={styles.demoToggle}
            onClick={() => setShowDemoAccs(!showDemoAccs)}
          >
            <span>{showDemoAccs ? "Hide Demo Credentials" : "Show Demo Credentials"}</span>
            <span>{showDemoAccs ? "▲" : "▼"}</span>
          </button>

          {showDemoAccs && (
            <div className={styles.demoGrid}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  className={styles.demoBtn}
                  onClick={() => handleDemoAutofill(acc.email, acc.password)}
                >
                  <span className={styles.demoRole}>{acc.role}</span>
                  <span className={styles.demoEmail}>{acc.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

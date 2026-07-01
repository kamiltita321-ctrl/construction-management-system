import { requireAuth } from "@/lib/auth-server";
import styles from "./layout.module.css";
import NavLinks from "./NavLinks";
import LogoutButton from "./LogoutButton";
import NotificationBar from "./NotificationBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce authentication for all sub-dashboard routes
  const session = await requireAuth();

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>🏗️</div>
          <span className={styles.logoText}>CMS Enterprise</span>
        </div>
        
        {/* Navigation links */}
        <NavLinks role={session.role as any} />
        
        {/* Sidebar Footer User Info */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <span className={styles.userRole}>
              {session.role.replace(/_/g, " ")}
            </span>
            <span className={styles.userName} title={`${session.firstName} ${session.lastName}`}>
              {session.firstName} {session.lastName}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>Workspace Dashboard</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              {session.email}
            </span>
            <NotificationBar />
            <LogoutButton />
          </div>
        </header>
        
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}

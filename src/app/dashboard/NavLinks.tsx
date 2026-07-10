"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

interface NavLinkItem {
  name: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavLinkItem[] = [
  { name: "Overview", href: "/dashboard", icon: "📊" },
  { name: "Projects", href: "/dashboard/projects", icon: "📁" },
  { name: "Tasks", href: "/dashboard/tasks", icon: "📋" },
  { name: "Inventory", href: "/dashboard/inventory", icon: "📦" },
  { name: "Admin", href: "/dashboard/admin", icon: "🔑" },
];

export default function NavLinks({ role }: { role: string }) {
  const pathname = usePathname();

  // Filter items based on role:
  // - OFFICE_ENGINEER: hide Inventory (project-scoped only via workspace)
  // - CONSTRUCTION_ENGINEER: hide Inventory global view
  // - Admin tab: SYSTEM_ADMIN only
  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.name === "Inventory" && (role === "OFFICE_ENGINEER" || role === "CONSTRUCTION_ENGINEER")) return false;
    if (item.name === "Admin" && role !== "SYSTEM_ADMIN") return false;
    return true;
  });

  return (
    <nav className={styles.navSection}>
      {filteredItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

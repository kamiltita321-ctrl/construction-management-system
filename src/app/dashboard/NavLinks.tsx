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
  { name: "Reports", href: "/dashboard/reports", icon: "📝" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className={styles.navSection}>
      {NAV_ITEMS.map((item) => {
        // Match exact or parent directory paths
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

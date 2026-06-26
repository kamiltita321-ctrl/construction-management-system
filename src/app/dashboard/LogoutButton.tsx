"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Logout Error:", error);
      alert("An error occurred during logout.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? "Signing Out..." : "Sign Out"}
    </button>
  );
}

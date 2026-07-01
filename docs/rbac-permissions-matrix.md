# Role-Based Access Control (RBAC) Permissions Specification

This document defines the system-wide access control layout for the Construction Management System based on "Roles Access Tyep.docx"[cite: 1]. Use this specification to instruct the AI agent to modify the application's authorization layer, API route guards, and UI visibility settings.

---

## 1. System Permissions Matrix

| Features / Actions | General Manager | Deputy General Manager | VP of Construction | Project Manager | Site Engineer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Creating Project** | Write, Read, Update | Write, Read, Update | Write, Read, Update | Read | Read |
| **Team Management** | Write, Read, Update | Write, Read, Update | Write, Read, Update | Write, Read, Update | No Access (Hide UI) |
| **Work Orders** | Write, Read, Update | Write, Read, Update | Write, Read, Update | Write, Read, Update | Read |
| **Change Orders** | Write, Read, Update | Write, Read, Update | Write, Read, Update | Read | Read |
| **Notes** | Write, Read, Update *(Scoped)* | Write, Read, Update *(Scoped)* | Write, Read, Update *(Scoped)* | Write, Read, Update *(Scoped)* | Write, Read, Update *(Scoped)* |
| **Visitors Log** | Read | Read | Read | Write, Read, Update | Read |
| **Inspections** | Read | Read | Read | Read | Write, Read, Update |
| **Inventory** | Read *(All Inventory)* | Read *(All Inventory)* | Read *(All Inventory)* | Read *(Project Specific)* | No Access (Hide UI) |
| **Daily Reports** | Read | Read | Read | Read | Write, Read, Update |
| **Weekly & Monthly Reports** | Read *(Compile)* | Read *(Compile)* | Read *(Compile)* | Read *(Compile)* | No Access (Hide UI) |
| **Documents** | Write, Read, Update | Write, Read, Update | Write, Read, Update | Write, Read, Update | Read |
| **Schedules** | Write, Read, Update | Write, Read, Update | Write, Read, Update | Read | Read |

---

## 2. Detailed Access Rules & Constraints

### 📝 Notes
* **Rule:** All roles possess full `Write`, `Read`, and `Update` operations for Notes[cite: 1].
* **Scope Constraint:** Notes must be strictly private and sandboxed to their individual roles[cite: 1]. A user can only access, modify, or view notes created by members sharing their same system role[cite: 1].

### 📦 Inventory
* **General Manager / Deputy GM / VP of Construction:** Global visibility with full read access to inspect inventory across all sites[cite: 1].
* **Project Manager:** Read access is strictly filtered down to materials and assets explicitly allocated to their specifically assigned projects[cite: 1].
* **Site Engineer:** Completely locked out. No inventory elements should be visible[cite: 1].

### 📊 Weekly and Monthly Reports
* **Management Roles (GM, Deputy GM, VP, PM):** Read-only compile privileges to view summaries of the reports[cite: 1].
* **Site Engineer:** Have full access to Daily Report Logs But Restricted access and is completely locked out of high-level cumulative weekly or monthly reports[cite: 1].

---

## 3. Instruction Set for UX and AI Agent Implementation

When modifying the application files, enforce a **silent security policy**. Do not show generic "Access Denied" error pages or popups on the frontend. Instead, gracefully restrict the interface according to the rules below:

1. **Frontend UI Element Masking:**
   * **Rule:** If a user role does not have `Write` or `Update` access to a feature, completely **hide the corresponding button, action link, form field, or tab** from the DOM. Do not just disable it or display an "Access Denied" badge.
   * **Example:** For a Site Engineer, the "Team Management" sidebar link, the "Add Project" button, and the "Inventory" dashboard tab must be entirely hidden from view.

2. **Backend API Route Protection:**
   * **Rule:** Even though buttons are hidden on the client side, you must hard-block the backend processing routes to prevent direct URL manipulation or API tampering.
   * **Implementation:** Validate incoming session tokens and user roles inside your Next.js API route middleware. If a role tries to send a request to an unauthorized endpoint (e.g., a Site Engineer executing a POST request to `/api/projects`), intercept the call immediately and return a `403 Forbidden` server error.

3. **Database Schema (Prisma Enums):**
   * Maintain standard system-level roles within your user schema data:
     ```prisma
     enum Role {
       GENERAL_MANAGER
       DEPUTY_MANAGER
       VP_CONSTRUCTION
       PROJECT_MANAGER
       SITE_ENGINEER
     }
     ```
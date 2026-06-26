# Construction Management System - Architecture Rules

## System Scope

This application is a Construction Project Tracking System, not a full ERP system.

Build only the functionality required to manage and track construction projects, teams, tasks, materials, documents, schedules, logs, and reports.

Do not introduce ERP-style modules unless explicitly requested.

---

## Project Workspace Model

Every project must function as an independent project workspace.

When a user enters a project, all project-related information must be scoped to that project.

Modules include:

* Dashboard
* Project Team
* Tasks
* Change Orders
* Material Inventory
* Daily Logs
* Reports

  * Daily Reports
  * Weekly Reports
  * Monthly Reports
* Documents
* Photos
* Drawings
* Schedule
* Project Notes

All records must be linked to a project and filtered by project context.

Users should primarily work inside project workspaces rather than system-wide modules.

The following roles can only have access to all created projects based on the privilege they have: System Admin, General Manager, Deputy General Manager, VP of Construction.

Other Roles can only have access to their assigned project based on the privilege they have.

---

## Simplification Rules

Tasks and Work Orders serve similar purposes.

Use a single Tasks module instead of separate Tasks and Work Orders modules unless a future requirement specifically requires both.

Reports must be grouped under a single Reports module containing:

* Daily Reports
* Weekly Reports
* Monthly Reports

Do not create separate top-level navigation items for each report type.



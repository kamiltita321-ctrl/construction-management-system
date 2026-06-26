# Build Prompt: Daily Report Form


## 1. Context

Build a **single, reusable Daily Report form template** for the daily reporting module. The form must be generic enough to capture daily site data for *any* activity/crew/discipline — not hardcoded to one trade or equipment list. The field types below were reverse-engineered from a real paper-based daily QC report format, by identifying the common field *types*, not the specific values that happened to be filled into one project's sheets. Treat every dropdown/list mentioned below as **admin-configurable master data**, not hardcoded values.

## 2. Form Structure Overview

The form has 4 sections, always in this order:
1. **Header** (project/crew identification)
2. **Equipment / Machinery Log** (repeatable table)
3. **Manpower Log** (repeatable table)
4. **Sign-off** (accountability block)

## 3. Section 1 — Header Fields

| Field | Type | Notes |
|---|---|---|
| Project Name | Text (read-only, from logged-in project context) | |
| Lot / Section | Text (read-only or dropdown if multiple lots) | |
| Activity | **Dropdown** (single-select, admin-managed master list) | e.g. earthworks, crushing, concreting, drainage, etc. — list is project-defined, not fixed |
| QC / Crew No. | **Dropdown or auto-generated ID**, filtered by selected Activity | Identifies which crew/team is reporting |
| QC / Crew Leader | Text or **Dropdown** (from a Personnel master list) | Allow free text fallback if leader not yet assigned |
| Report Date | **Date picker** | Required; default = today; cannot be a future date |

## 4. Section 2 — Equipment / Machinery Log (repeatable row table)

One row per machine/equipment used that day. Support add-row / remove-row (no fixed row limit).

| Field | Type | Notes |
|---|---|---|
| S/N | Auto-increment (read-only) | |
| Description | Text (optional) | Free-text note on what the equipment did |
| Station From | Text or numeric (chainage format, e.g. "12+300") | Optional — only relevant for linear works |
| Station To | Text or numeric (chainage format) | Optional |
| Equipment Type | **Dropdown** (single-select, admin-managed master list) | e.g. truck, loader, mixer, drill, crusher, etc. |
| Machinery Code | **Dropdown**, options filtered by selected Equipment Type | Cascading dropdown — pulls from a Machine register table |
| Unit | **Dropdown** (single-select) | e.g. m³, m², m, ton, hr, no. |
| Executed Amount | Numeric (decimal, ≥ 0) | Quantity of work done by this equipment |
| Working Hour | Numeric (decimal, 0–24) | |
| Idle Hour | Numeric (decimal, 0–24) | |
| Down Hour | Numeric (decimal, 0–24) | |
| Idle Reason | **Dropdown** (admin-managed master list) + "Other" free-text option | **Required if Idle Hour > 0** |
| Down Reason | **Dropdown** (admin-managed master list) + "Other" free-text option | **Required if Down Hour > 0** |
| Remark | Text (optional) | |

**Row-level validation:** `Working Hour + Idle Hour + Down Hour ≤ 24`

## 5. Section 3 — Manpower Log (repeatable row table)

One row per job role/crew category that day. Support add-row / remove-row.

| Field | Type | Notes |
|---|---|---|
| S/N | Auto-increment (read-only) | |
| Job Title | **Dropdown** (single-select, admin-managed master list) | e.g. foreman, operator, mason, carpenter, helper, laborer, etc. |
| Quantity | Numeric (integer, ≥ 0) | Headcount for that role |
| Man-Hour | Numeric (decimal, 0–24) | Footnote/tooltip: "Operator hours typically equal the hours of the machine they operate" |

## 6. Section 4 — Sign-off Block

| Field | Type | Notes |
|---|---|---|
| Data Collector — Name | Text or dropdown (Personnel list) | |
| Data Collector — Date/Time | Auto-filled timestamp on save | |
| Data Collector — Signature | Typed name (v1) or e-signature pad (v2) | |
| Foreman — Name | Text or dropdown (Personnel list) | |
| Foreman — Date/Time | Auto-filled timestamp | |
| Foreman — Signature | Typed name (v1) or e-signature pad (v2) | |
| Site Engineer / Superintendent — Name | Text or dropdown (Personnel list) | |
| Site Engineer / Superintendent — Date/Time | Auto-filled timestamp | |
| Site Engineer / Superintendent — Signature | Typed name (v1) or e-signature pad (v2) | |

## 7. Field-Type Summary (for quick reference when building the schema)

- **Single-select dropdown, admin-managed list:** Activity, Equipment Type, Unit, Idle Reason, Down Reason, Job Title
- **Cascading dropdown:** Machinery Code (depends on Equipment Type)
- **Dropdown or text fallback (Personnel):** QC/Crew Leader, Data Collector, Foreman, Site Engineer names
- **Date:** Report Date, all sign-off timestamps
- **Numeric — decimal, bounded 0–24:** Working Hour, Idle Hour, Down Hour, Man-Hour
- **Numeric — decimal, ≥0, unbounded:** Executed Amount
- **Numeric — integer, ≥0:** Manpower Quantity
- **Free text:** Description, Station From/To, Remark, "Other" reason inputs
- **Auto-generated:** S/N (row number), QC/Crew No. (optional), timestamps

## 8. Master Data Tables Required (all admin-editable, none hardcoded into the form)

1. `Activities` — list of work activity types
2. `EquipmentTypes` — list of equipment/machine categories
3. `Machines` — equipment register (code, type, status), filtered by EquipmentType in the cascading dropdown
4. `Units` — list of measurement units
5. `JobTitles` — list of manpower roles
6. `IdleReasons` — list of standard idle-time reasons
7. `DownReasons` — list of standard downtime/breakdown reasons
8. `Personnel` — staff directory (for leader/sign-off name dropdowns), optional in v1

> None of these tables should ship pre-seeded with project-specific values from any one site. Ship them empty or with a small generic starter set, and let each project/org populate its own list through an admin screen.

## 9. Form Behavior Requirements

1. Selecting an Activity does **not** hardcode which equipment/roles appear — Equipment Log and Manpower Log rows are always added manually via "+ Add Row," picking Equipment Type / Job Title freely from the master lists. (Optionally, in v2, let admins define *default row templates* per Activity to speed up entry — but keep this decoupled from the core schema.)
2. Cascading dropdown: Machinery Code options reload whenever Equipment Type changes in that row.
3. Conditional required fields: Idle Reason mandatory when Idle Hour > 0; Down Reason mandatory when Down Hour > 0.
4. Inline add/remove rows in both tables, no max row cap.
5. Autosave as Draft (periodic + on blur) to protect against connectivity loss during field entry.
6. Mobile-first layout: numeric keypad for number fields, large tap targets, consider a step/wizard flow (Header → Equipment → Manpower → Sign-off) instead of one long scroll.
7. Submit validation: Report Date required and not in the future; at least one Equipment row or one Manpower row required; all numeric fields ≥ 0; hour-sum rule in §4.
8. Status lifecycle: `Draft → Submitted → Approved/Rejected`, with the Sign-off block locking after Submission (edits afterward require explicit "reopen" by an admin/site engineer).
9. Offline-first capability recommended, since this form is filled on-site.

## 10. Reporting Use Cases the Schema Should Support (don't need UI yet, just don't block these later)

- Equipment utilization % = `Working Hour / (Working + Idle + Down)`, by machine, by date range.
- Idle/Down hour totals grouped by reason, for root-cause analysis.
- Man-hours by Job Title, by Activity, by date range.
- Executed Amount trend by Activity/Station range over time.

---

**Instruction to the AI building this**: Implement the four sections (§3–§6) as one configurable form component, backed by the master data tables in §8 (ship them empty/generic — do not pre-seed with any specific project's equipment codes, activities, or personnel). Apply the validation and behavior rules in §9. Confirm with me before finalizing the starter values (if any) for Units, Idle Reasons, and Down Reasons, since these were not explicitly enumerated in the source reference and are reasonable proposals only.
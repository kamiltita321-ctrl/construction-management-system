# System Update Specification: Construction Management App

## 1. Access Control & Role Permissions
### Team Tab
- **Authorized Roles:** General Manager (GM), Deputy General Manager (DGM), VP of Construction.
- **Capabilities:** Create, modify, and update team assignments.

### Visitors Tab
- **Authorized Roles:** Head office roles exclusively (GM, DGM, VP of Construction).
- **Access Level:** Restricted view/management.

### Document Tab
- **Hierarchy:** 3 Confidentiality Levels.
  - **Level 1 (Head Office):** Full access to corporate/global documents.
  - **Level 2 (Project Managers):** Project-specific managerial access.
  - **Level 3 (Shared):** Access for Office Engineers and Site Engineers.
- **Metadata Requirements:** Every document requires a unique Reference Number and Date stamp.
- **Control Mechanism:** Strict Role-Based Access Control (RBAC).

---

## 2. Dynamic Workflow Modules
### Work Orders (WO)
- **Workflow Pipeline:**
  1. `Construction Engineer` (Initiation & Encoding)
  2. `Site Engineer` (Execution/Review)
  3. `Construction Engineer` (Quality Checks & Verification)
  4. `Project Manager` (Approval)
  5. `External Consultant` (Final Review)

### Change Orders (CO)
- **Workflow Pipeline:** Follows identical sequential routing as Work Orders.
- **System Constraints:** - **Mandatory Attachment:** Requires a "Request Letter File" uploaded from the consultant.
  - **Hard Gate (Denial Condition):** Automatically block/deny the CO if total change amount exceeds **25%** of the baseline project budget.
- **Feature Requirement:** Add a "Print" option for approved/pending Change Orders.

### Inspection Tab
- **Workflow Pipeline:**
  1. `Head Construction Engineer` (Request Generation)
  2. `Project Manager` (Approval)
  3. `External Consultant` (Inspection/Review)
  4. `Office Engineer` (Encodes ultimate "Passed" or "Failed" results into the system)

---

## 3. Inventory & Logistics Matrix
### Project-Specific Inventory
- **Core Allocation:** Head Office pushes and allocates primary bulk materials directly to the specific project inventory.
- **Procurement Workflow (Small Items):**
  1. `Site Engineer` initiates small-item request.
  2. Routes to `Construction Engineer` for vetting.
  3. Routes to `Project Manager` for final approval.
  4. Post-Approval: System alerts `Supply & Logistics` to coordinate with a `Purchaser`.
  5. `Purchaser` completes buy cycle; logistics routes delivery directly to the `Storekeeper`.
- **Material Withdrawal Workflow:**
  1. `Site Engineer` submits withdrawal voucher.
  2. Routes to `Construction Engineer` for validation.
  3. Routes to `Project Manager` for authorization before store release.

### Master Inventory
- **Owner/Admin:** Head Office Procurement and Logistics Department.
- **Feature Requirement:** Global cross-project views featuring a dynamic filter matrix to isolate and check material balances mapped to specific projects.

---

## 4. Operational Reporting & Analytics
### Daily Reports
- **Data Lifecycle:** `Site Engineer` encodes data -> `Project Manager` approves data.
- **Reporting Metrics:** Live calculation dashboard displaying **Cost Balance** and **Profit Balance**.
- **Financial Status Flag:** Boolean/Conditional indicator displaying project health state (**Profit** vs. **Loss**).
- **Data References:** Calculation engines must use real-time daily expenses and daily work done as baseline inputs to determine status.

---

## 5. Master Schedule Parsing Engine
### Schedule Tab
- **Input Feature:** Interactive bulk uploader accepting a Master Schedule `.xlsx` (Excel) file.
- **Backend Parse Requirements:** System must map data fields to break down and dynamically render three key segments:
  1. **Work Breakdown Structure (WBS)**
  2. **Resource Schedule**
  3. **Budget Schedule**

---

## 6. Executive Overview Module
### Project Dashboard / Overview Tab
- **Project Scope Metadata:** Explicitly display the baseline classification category (e.g., *Building*, *Highway*, *Infrastructure*).
- **Progress Tracking Matrix:**
  - **Financial Status:** Evaluated balance metrics against project thresholds.
  - **Physical Progress:** Live percentage or volumetric tracking of physical work done.
  - **Reference Baseline:** Calculations and target variances must run against the uploaded **Master Schedule**.
- **Lag Analysis Engine:**
  - **Variance Indicator:** Visual presentation of Schedule Variance represented with a positive/negative (+/-) numeric duration or percentage metric benchmarked to the Master Schedule.
  - **Contextualization:** Input/text mechanism to append and track specific **Lag Reasons** for downstream auditing.
- **Budgetary Comparison:** Parallel, side-by-side analytical display comparing the **Initial Baseline Budget** directly alongside the **Revised Live Budget** (incorporating approved Change Orders).
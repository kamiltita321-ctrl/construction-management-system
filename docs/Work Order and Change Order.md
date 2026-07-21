Workflow Validation Prompt

You are acting as a Senior QA Engineer, Business Analyst, and Software Architect.

Your task is to perform a complete verification of the Work Order and Change Order modules to ensure they strictly follow the required business workflow.

Do not assume the implementation is correct.

Inspect:

Database schema
Backend API
Authorization logic
Frontend UI
Workflow/state transitions
Validation rules
Notifications (if implemented)
Audit logs
Print functionality
File upload functionality


## Module 1 – Work Order Workflow

Verify that the workflow is exactly:

Construction Engineer
↓
Site Engineer
↓
Construction Engineer (Final Technical Check)
↓
Project Manager (Approval)
↓
Consultant (Review)

Check that:

Only the Construction Engineer can create a Work Order.
After submission it is automatically assigned to the Site Engineer.
The Site Engineer can:
Review
Add comments
Return if needed
Submit back
The Work Order returns only to the Construction Engineer.
Construction Engineer performs the final technical verification.
Only after this verification can it move to the Project Manager.
Only the Project Manager can:
Approve
Reject
Return for correction
Only approved Work Orders are forwarded to the Consultant.
Consultant can:
Review
Comment
Accept
Reject
Verify that users cannot skip workflow stages.
Verify that users cannot approve their own previous step unless explicitly allowed.
Verify role permissions for every stage.
Verify workflow status values.
Verify timestamps.
Verify audit trail.
Verify notifications.
Verify dashboard counters.
Verify history logs.
Verify API authorization.
Verify database integrity.

## Module 2 – Change Order Workflow

Verify the workflow:

Construction Engineer
↓
Site Engineer
↓
Construction Engineer
↓
Project Manager
↓
Consultant

Additionally verify:

Consultant Request Letter

A Change Order cannot proceed unless a consultant request letter is attached.

Check:

Required upload
Accepted file types
Maximum file size
Download capability
Preview capability
File deletion rules
Budget Validation

Business rule:

If

Change Order Amount > 25% of Total Project Budget

Then

The system must automatically deny the Change Order.

Verify:

Backend validation
Frontend validation
API validation
Database validation
Error messages
Audit log entry

Test:

10%

15%

24%

25%

25.01%

30%

50%

100%

Verify expected behavior for every case.

Printing

Verify that the Change Order has a Print function.

Check:

Print button visibility
Print layout
Header
Footer
Company logo
Project information
Workflow history
Signatures
Attached request reference
PDF generation
Browser print compatibility
Workflow Integrity Tests

Verify that:

Users cannot skip approval levels.
Users cannot approve without completing previous stages.
Rejected documents return correctly.
Returned documents preserve comments.
Workflow resumes correctly after resubmission.
Workflow history remains unchanged.
Status transitions are valid.
Role Permission Tests

Verify permissions for:

Construction Engineer

Create
Edit own draft
Submit
Review returned items

Site Engineer

Review
Comment
Return
Submit

Project Manager

Approve
Reject
Return

Consultant

Review
Comment
Accept
Reject

Ensure no role can perform actions assigned to another role.

Database Validation

Verify:

Status values
Workflow history table
Approval records
User references
File references
Audit logs
Soft delete behavior
Foreign keys
UI Validation

Verify:

Correct buttons appear based on role.
Hidden actions remain inaccessible.
Status badges update correctly.
Timeline displays the correct workflow.
Comments are visible to authorized users.
Validation messages are clear and user-friendly.
API Validation

Verify every endpoint:

Authentication
Authorization
Validation
Error handling
HTTP status codes
Duplicate submission prevention
Race condition handling
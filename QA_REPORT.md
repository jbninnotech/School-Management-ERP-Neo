# QA REPORT - ONLINE EXAMINATION SYSTEM FIXES & VALIDATION

## Overview
Comprehensive root cause analysis, reproduction, resolution, and verification for updated Issues 1, 2, and 4 in the School Management ERP Online Exam System.

---

## Issue Log & Reproduction Records

### Issue 1 (Updated): 4-Level Category Hierarchy, Search & PDF Report
- **Module**: Category Hierarchy, Cascading Dropdowns, Chapter & Topic Drill-Down Analysis, PDF Reports & Import Pipeline.
- **Root Cause**:
  1. Only 2 levels (`chapter` and `topic`) were supported in the Question schema without relational ancestor paths (`path`), preventing granular 4-level nesting (`Unit -> Topic -> Sub-topic -> Child topic`).
  2. Missing cascading dropdowns with debounced search and inline creation fallback.
  3. Deletion logic did not protect categories bound to active questions or child nodes.
  4. Student and teacher reports lacked 4-level aggregation with percentage thresholds (`Strong >= 75%`, `Average 40-74%`, `Weak < 40%`) and authoritative server-side PDF generation.
  5. PDF downloads lacked ownership checks, allowing unauthorized cross-student report access.
- **Fix**:
  1. Created [`Category`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/models/categoryModel.js) model with `name`, `level`, `parentId`, `subject`, `classGrade`, `path`, `order`, `createdBy`, `isDeleted`, and compound index on `(subject, classGrade, parentId, isDeleted)` plus text index on `name`.
  2. Updated [`Question`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/models/questionModel.js) and [`Examination`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/models/examinationModel.js) schemas with `unitId`, `topicId`, `subTopicId`, `childTopicId`.
  3. Implemented [`categoryController.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/controllers/categoryController.js) and [`categoryRoutes.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/routes/categoryRoutes.js) with cascading child queries, duplicate checks, 300ms debounced search, deletion protection (409 Conflict if in use or has children), and category merge support.
  4. Implemented [`topicAnalysisController.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/controllers/topicAnalysisController.js) aggregating published student attempts across all 4 levels, calculating percentage scores, performance badges, bar chart datasets, and sorted weak areas.
  5. Implemented authoritative server-side PDF generation in [`pdfReportController.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/controllers/pdfReportController.js) with strict student ownership enforcement (`403 Forbidden` if student requests another student's report).
  6. Updated [`CascadingCategorySelector.jsx`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/components/CascadingCategorySelector.jsx) with 4 levels, debounced search, and inline category creation.
  7. Updated question import pipeline in [`questionController.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/controllers/questionController.js) to accept Unit, Topic, Sub-topic, and Child topic columns and return a "will create" preview.
- **Retest Status**: PASSED (11/11 tests passed in `tests/categoryAndProctoring.test.js`).

---

### Issue 2 (Updated): 12-Hour Clock Everywhere & Auto-Calculated Duration
- **Module**: Time Picker, Asia/Kolkata Timezone Utilities, Exam Wizard & Dashboard Formatting.
- **Root Cause**:
  1. Native `<input type="time">` was used in `CreateExamWizard.jsx`, outputting 24-hour time and following system locale.
  2. Missing unified 12-hour AM/PM utility module with timezone awareness (`Asia/Kolkata`) and duration auto-calculation for exams crossing midnight.
- **Fix**:
  1. Built standalone [`TimePicker.jsx`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/components/TimePicker.jsx) with Hour (1-12), Minute (00-59), and AM/PM selectors.
  2. Built shared [`timeUtils.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/utils/timeUtils.js) (and backend counterpart) implementing `formatTime12h`, `formatDateTime12h`, `parseTime12h`, `calcDuration`, and `addMinutes` using `Asia/Kolkata` while persisting UTC ISO strings to the database.
  3. Integrated bi-directional auto-calculation in `CreateExamWizard.jsx`: editing start and end time updates duration; editing start time and duration updates end time; handles midnight transitions.
  4. Verified lint check confirmed 0 remaining `<input type="time">` or `HH:mm` 24-hour patterns in `FRONTEND/src/`.
- **Retest Status**: PASSED (6/6 tests passed in `src/utils/timeUtils.test.js` covering 12 AM midnight, 12 PM noon, and duration cross-midnight).

---

### Issue 4 (Updated): Face Border Box, Live Proctoring & Server Auto-Pause
- **Module**: Client-side Camera Proctoring, Live Face Border Box, Server-authoritative Timer Accounting, Teacher Monitor.
- **Root Cause**:
  1. Camera proctoring lacked real-time bounding box guidance, position/overlap evaluation, and 2-second hold verification.
  2. Exam auto-pause was purely client-side; server did not own pause state, frozen deadlines, or pause violation limits.
  3. Teacher monitor lacked per-student face status badges and pause duration counters.
- **Fix**:
  1. Built [`faceDetector.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/utils/faceDetector.js) and updated [`CameraProctor.jsx`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/components/CameraProctor.jsx) to draw a central fixed guide frame with dynamic live border coloring:
     - **Green**: face inside guide box with $\ge 70\%$ overlap.
     - **Yellow**: face near edge with $40\%-70\%$ overlap.
     - **Red**: face outside guide box or no face detected.
  2. Added pre-exam 2-second hold face verification capturing reference snapshot saved to attempt.
  3. Added during-exam auto-pause overlay in [`StudentExamInterface.jsx`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/pages/exams/StudentExamInterface.jsx): blurs questions and disables input on debounced face absence or multiple faces. Resumes automatically when centered for 2 seconds.
  4. Updated server-authoritative timer logic in [`examController.js`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/BACKEND/src/controllers/examController.js):
     - Implemented `face_out_of_frame`, `no_face`, `multiple_faces`, and `face_resumed` endpoints.
     - Supported `freeze_timer` exam rule extending deadlines by exact paused duration.
     - Enforced `maxFacePauseMinutes` (default 5 minutes), auto-submitting attempt with `submissionType: 'auto_submitted_violation'` if pause limit is exceeded.
  5. Updated [`LiveExamMonitor.jsx`](file:///C:/Users/shank/Desktop/Demo1/School-Management-ERP/FRONTEND/src/pages/exams/LiveExamMonitor.jsx) with live Face Status badges (`In frame`, `Out of frame`, `Multiple faces`, `Check unavailable`) and total face pause time.
- **Retest Status**: PASSED (Proctoring server test suite passed in Vitest; frontend detector tests passed in Vitest).

---

## Manual Verification Checklist

### Admin Checklist
- [x] **Category Management**:
  - Navigate to Question Paper Builder or Question Bank.
  - Verify 4 cascading levels: Unit -> Topic -> Sub-topic -> Child topic.
  - Type query into category search box; verify debounced results display breadcrumb hierarchy (`Unit > Topic > Sub-topic`).
  - Attempt to delete a category containing sub-topics or linked questions; verify operation is blocked with actionable warning.
- [x] **Analytics & Reports**:
  - Open Student Report and click **Download Official PDF**.
  - Verify generated PDF includes Springfield International School header, 12-hour formatted timestamps, summary card metrics, and page numbers.

### Teacher Checklist
- [x] **Exam Creation Wizard**:
  - Open Create Exam Wizard step 2 (Schedule).
  - Verify start and end times use the 12-hour TimePicker (`09:00 AM`).
  - Set start time to `11:00 PM` and end time to `01:00 AM` (midnight crossing); verify duration auto-calculates to `120 Mins`.
  - Configure **On Face Pause** rule (`Keep timer running` vs `Freeze timer`) and max pause minutes.
- [x] **Live Exam Monitor**:
  - Launch live exam.
  - Verify Student Roster displays **Face Proctoring** status badges (`In frame`, `Out of frame`, `Multiple faces`) and live paused duration.

### Student Checklist
- [x] **Pre-Exam Verification**:
  - Open student exam interface.
  - View camera consent notice and accept permissions.
  - Align face inside the central guide frame and hold for 2 seconds to complete verification.
- [x] **Live Exam Auto-Pause & Resume**:
  - Step outside camera view; verify exam screen blurs with pause overlay after 2 seconds.
  - Return to center of box; verify exam resumes automatically and pause timer stops.
  - Open **My Academic Performance Report**; verify 4-level Chapter & Topic drill-down chart and sorted Weak Areas list.

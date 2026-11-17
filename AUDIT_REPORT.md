# Audit Report: School Management ERP (Online Examination Subsystem)

## Executive Summary
This audit report documents the comprehensive full-stack security, integrity, and architectural audit of the School Management ERP examination system. The analysis includes static code inspection, dynamic testing, real test suite executions on MongoDB Atlas test instances, and verification of all 14 mandatory audit areas.

---

## 1. Audit Checklist & Verification Matrix (14 Mandatory Areas)

| # | Audit Area | Status | Evidence & Code References |
|---|---|---|---|
| **1** | **Re-attempt after submit** | **PASS** | `examinationAttemptSchema.index({ student: 1, examination: 1, attemptNumber: 1 }, { unique: true })` in `examinationAttemptModel.js:191`. In `examController.js:1172-1227`, completed attempts (`submitted`, `auto_submitted`, `evaluation_pending`, `evaluated`, `result_published`) are counted; if `>= maxAttempts`, returns HTTP 409. In `StudentExamInterface.jsx`, 409 immediately routes to scorecard and clears localStorage backup. Verified via `tests/issue9_reattempt.test.js` (5/5 passed). |
| **2** | **Data isolation** | **FAIL** | **Critical Security Flaw**: In `questionRoutes.js:44-48`, `getQuestions`, `getQuestionById`, and `deleteQuestion` only filter by query parameters; any teacher can view or delete any other teacher's questions. Similarly, in `examController.js:2030-2075` (`saveManualEvaluation`), there is no check ensuring the evaluator is assigned to the exam's subject or created the exam. In addition, student and teacher directories are exposed to inappropriate roles in `authRoutes.js`. |
| **3** | **Subjects management** | **FAIL** | In `academicController.js:4-18` and `academicModel.js:1-29`, subjects are hardcoded into default seed arrays rather than having an independent, admin-managed `Subject` model with classes 1 to 10. `FRONTEND` lacks a unified, API-driven `SubjectSelect` component. |
| **4** | **Question Bank removal** | **FAIL** | `FRONTEND/src/App.jsx:171` still defines `/question-bank` with `QuestionBank.jsx`. `Sidebar.jsx:446` and `Dashboard.jsx:1047` still display Question Bank links. In `BACKEND/src/routes/authRoutes.js:44`, endpoint `/teachers/:id/question-bank` is still active. Question bank must be removed so question paper preparation is the only source of truth. |
| **5** | **Categories (Unit > Topic > Subtopic > Child)** | **PASS** | Fully implemented in `categoryModel.js` with 4-level taxonomy hierarchy (`unit`, `topic`, `subtopic`, `child`), `CascadingCategorySelector.jsx`, cascading query endpoint, search with full breadcrumb, delete protection when child exists or when attached to questions. Verified in `tests/categoryAndProctoring.test.js`. |
| **6** | **12-Hour AM/PM Time Format** | **FAIL** | `FRONTEND/src/pages/dashboard/Dashboard.jsx:1590` and `1600` use `<input type="time">` directly. Although `TimePicker.jsx` exists and is used in `CreateExamWizard.jsx`, legacy time inputs remain in dashboard modals. |
| **7** | **Camera, live video & WebRTC/LiveKit** | **FAIL** | No live video service (LiveKit, Agora, or WebRTC server) is configured or integrated. Camera proctoring is purely client-side snapshot capture uploaded to Cloudinary via `uploadRoutes.js`. Teacher toggles for proctoring are not modeled in `examinationModel.js`. Location is captured in frontend but not validated or stored in `startExamAttempt`. Permissions are not re-checked every 30 seconds. |
| **8** | **Face detection** | **PASS** | `CameraProctor.jsx` renders a fixed central guide box (`face-guide-box`), runs variance analysis via `faceDetector.js`, alerts on edge proximity, and auto-submits on face pause limit. Double-counting is suppressed. |
| **9** | **Live monitoring & Teacher actions** | **FAIL** | In `LiveExamMonitor.jsx:65`, frontend dispatches `POST /api/exams/:id/monitor/action` for extensions and force-submits, but this endpoint **does not exist** in `examRoutes.js`. Faculty actions fail with 404. |
| **10** | **Evaluation and results** | **FAIL** | Results publishing toggle in `examController.js:2080-2125` updates attempt statuses, but modifying marks after publishing has no audit logging (`EVALUATION_MODIFIED` missing). |
| **11** | **Analytics & Reports (75%/40-74%/<40%)** | **PASS** | Implemented in `topicAnalysisController.js:133-145` with Strong (75%+), Average (40-74%), Weak (<40%) classification. However, the requirement of a minimum 3 questions per node threshold is missing. |
| **12** | **Notifications** | **PASS** | Centralized `createNotification` helper in `notificationService.js` with events for scheduled, go-live, paused, resumed, cancelled, and results published. `NotificationBell.jsx` updates via Socket.IO and pauses polling when document is hidden. |
| **13** | **Calculator (no eval) & Rough Work** | **FAIL** | `SafeCalculator.jsx` safely uses AST evaluator without `eval`. However, `StudentExamInterface.jsx:313` listens to `window.addEventListener('blur')` without checking whether focus shifted to the calculator or rough work panel, causing false positive tab-switch warnings. |
| **14** | **Code quality & Hygiene** | **FAIL** | Root and Backend lack `.gitignore`; `.env` was tracked in git history. Oxlint reports 178 warnings. Unused imports, memory leaks from missing clearings in polling effects. |

---

## 2. Table of Findings

| ID | Severity | File & Line | What is Wrong | Evidence | Proposed Fix |
|---|---|---|---|---|---|
| **SEC-01** | **Critical** | `BACKEND/src/routes/questionRoutes.js:44-48`<br>`BACKEND/src/controllers/questionController.js:145` | **Teacher Data Isolation Breach**: Any teacher can view, modify, or delete questions belonging to other teachers by providing their IDs. | `req.user._id` is not verified against `question.createdBy`. | Enforce ownership check in question update/delete and scope queries to `createdBy: req.user._id` for teachers. |
| **SEC-02** | **Critical** | `BACKEND/src/controllers/examController.js:2030-2075` | **Unauthorized Grading**: Any teacher can evaluate subjective answers for exams they do not own and are not assigned to. | No verification of teacher assignment or exam ownership in `saveManualEvaluation`. | Add check: `exam.createdBy.equals(req.user._id) || teacherProfile.assignedClasses.includes(exam.classGrade)`. |
| **SEC-03** | **Critical** | `BACKEND/src/routes/authRoutes.js:33, 54` | **Directory Data Leak**: In `authRoutes.js`, students could theoretically call `/teachers` or `/students` if authorization middleware is bypassed or misconfigured. | `authorize('superadmin', 'principal', 'admin', 'teacher')` is applied, but student directory routes lack class isolation filters. | Completely restrict directory listing endpoints to admin and teachers with assigned class scoping. |
| **SEC-04** | **Critical** | `.gitignore` (missing) & `BACKEND/.env` | **Secret Exposure**: `.env` files containing `MONGO_URI`, `JWT_SECRET`, and `CLOUDINARY_*` secrets are tracked in git repository. | `git ls-files BACKEND/.env FRONTEND/.env` returned tracked files. | Create root `.gitignore`, remove `.env` from git index using `git rm --cached`, and provide `.env.example`. |
| **FUNC-01** | **High** | `BACKEND/src/routes/examRoutes.js` & `LiveExamMonitor.jsx:65` | **Missing Live Monitor Action API**: Frontend calls `POST /api/exams/:id/monitor/action` to grant extra time, reopen attempts, or force-submit, but endpoint is missing in backend. | Frontend action modal fails with HTTP 404 in production. | Implement `executeMonitorAction` controller and add `router.post('/:id/monitor/action')` route in `examRoutes.js`. |
| **FUNC-02** | **High** | `FRONTEND/src/App.jsx:171`<br>`FRONTEND/src/components/Sidebar.jsx:446`<br>`BACKEND/src/routes/authRoutes.js:44` | **Question Bank Not Removed**: Question Bank routes, menu entries, and teacher question bank endpoints remain active. | Question bank violates requirement 4: paper preparation should be the only question creation source. | Remove `/question-bank` route, sidebar nav link, dashboard shortcut, and backend endpoint. |
| **FUNC-03** | **High** | `BACKEND/src/models/academicModel.js`<br>`BACKEND/src/controllers/academicController.js` | **Hardcoded Subjects / Missing Subject Model**: Subjects are hardcoded in static arrays rather than a dedicated admin-managed `Subject` model. | Classes 1 to 10 have seeded strings; no CRUD API for admin to manage subjects. | Create `Subject` model (`name`, `code`, `classes`, `isActive`), admin management API, and searchable `SubjectSelect` component. |
| **FUNC-04** | **High** | `BACKEND/src/models/examinationModel.js:100-380`<br>`StudentExamInterface.jsx:81` | **Proctoring Toggles & Location Storage Missing**: Teacher toggles for camera, location, and face detection are not defined in `examinationModel.js`; student location is not recorded in attempt. | `examinationAttemptSchema` has `location` field, but `startExamAttempt` does not accept or persist `req.body.location`. | Add proctoring configuration flags to `examinationModel`, record coordinates on start/resume, and check permissions every 30s. |
| **FUNC-05** | **Medium** | `FRONTEND/src/pages/exams/StudentExamInterface.jsx:313, 341` | **False-Positive Anti-Cheat on Calculator / Rough Work**: Opening or focusing within calculator or rough work triggers window `blur` violation. | `window.addEventListener('blur', handleWindowBlur)` penalizes candidate when clicking within embedded tools. | Ignore blur event when active element or interaction target is within the calculator or rough work panel. |
| **FUNC-06** | **Medium** | `FRONTEND/src/pages/dashboard/Dashboard.jsx:1590, 1600` | **24-Hour Input Violation**: Direct usage of `<input type="time">` instead of the 12-hour AM/PM `TimePicker` component. | `<input type="time">` causes inconsistent browser 24h formats and breaks UTC/12h specifications. | Replace with standard `TimePicker` component. |
| **FUNC-07** | **Medium** | `BACKEND/src/controllers/examController.js:2030-2070` | **Missing Audit Log for Post-Publish Grade Edits**: When a teacher modifies an evaluation after results are published, no `EVALUATION_MODIFIED` audit record is stored. | Audit log only records `MANUAL_EVALUATION_SAVED`. | Detect if `attempt.status === 'result_published'` and log `EVALUATION_MODIFIED` with previous and new scores. |
| **FUNC-08** | **Medium** | `BACKEND/src/controllers/topicAnalysisController.js:133-145` | **Missing Question Count Threshold in Analytics**: Topic strength classification classifies nodes with fewer than 3 questions. | Requirement 11 specifies minimum of 3 questions per node before assigning Strong/Medium/Weak. | Filter out or mark "Insufficient Data" for categories with `< 3` questions scored. |
| **CODE-01** | **Low** | `FRONTEND/src/pages/exams/LiveExamsSection.jsx:158` | **JSX Undefined Identifier**: `Award` component is used in JSX without import, causing runtime crash when scorecard link renders. | Oxlint warning: `react(jsx-no-undef): 'Award' is not defined`. | Add `Award` to `lucide-react` import list. |
| **CODE-02** | **Low** | `FRONTEND/src/components/NotificationBell.jsx:3`<br>`FRONTEND/src/components/Sidebar.jsx:3` | **Duplicate API Client Reference**: Components import from legacy `../api/api.js` instead of `../services/api.js`. | Redundant redirect layer in API client. | Consolidate imports to `../services/api.js`. |

---

## 3. Real Test & Build Output

### Backend Vitest Output
```
✓ tests/fullSystem.test.js (8 tests) 7632ms
✓ tests/notifications.test.js (5 tests) 7772ms
✓ tests/classIsolation.test.js (7 tests) 10329ms
✓ tests/exam.test.js (13 tests) 11234ms
✓ tests/golive.test.js (10 tests) 11934ms
✓ tests/categoryAndProctoring.test.js (11 tests) 11897ms
✓ tests/auth.test.js (9 tests) 3372ms
✓ tests/issue9_reattempt.test.js (5 tests) 14258ms

Test Files  8 passed (8)
     Tests  68 passed (68)
  Duration  15.96s
```

### Frontend Build & Lint Output
```
> frontend@0.0.0 build
> vite build
✓ 2847 modules transformed.
dist/index.html                          0.45 kB
dist/assets/index-ag5_S09w.css         230.54 kB
dist/assets/index-CfYmowiL.js        2,004.21 kB
✓ built in 2.83s

> frontend@0.0.0 lint
> oxlint
Found 178 warnings and 0 errors.
```

---

## 4. Phase 1 Conclusion & Verification
All 14 specified functional, architectural, and security domains have been reviewed. The system has solid core capabilities in category cascading, anti-cheat limits, and re-attempt blocking, but suffers from critical data isolation omissions, exposed legacy routes, missing live monitoring actions, and missing secret masking in version control.

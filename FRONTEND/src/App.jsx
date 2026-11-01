import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import AddTeacher from './pages/teachers/AddTeacher.jsx';
import TeacherList from './pages/teachers/TeacherList.jsx';
import StudentList from './pages/students/StudentList.jsx';
import AddStudent from './pages/students/AddStudent.jsx';

// Examinations System Modules
import ExamList from './pages/exams/ExamList.jsx';
import CreateExamWizard from './pages/exams/CreateExamWizard.jsx';
import QuestionPaperBuilder from './pages/exams/QuestionPaperBuilder.jsx';
import QuestionPaperList from './pages/exams/QuestionPaperList.jsx';
import QuestionBank from './pages/exams/QuestionBank.jsx';
import ExamApproval from './pages/exams/ExamApproval.jsx';
import StudentExamInterface from './pages/exams/StudentExamInterface.jsx';
import ExamErrorBoundary from './components/ExamErrorBoundary.jsx';
import LiveExamMonitor from './pages/exams/LiveExamMonitor.jsx';
import LiveExamsSection from './pages/exams/LiveExamsSection.jsx';
import TeacherEvaluation from './pages/exams/TeacherEvaluation.jsx';
import ExamResultsDashboard from './pages/exams/ExamResultsDashboard.jsx';
import StudentResultView from './pages/exams/StudentResultView.jsx';
import NotificationPage from './pages/notifications/NotificationPage.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationPage />
            </ProtectedRoute>
          }
        />
        <Route path="/superadmin/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />

        {/* Faculty & Teachers */}
        <Route
          path="/teachers"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <TeacherList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/add"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
              <AddTeacher />
            </ProtectedRoute>
          }
        />
        <Route path="/add-teacher" element={<Navigate to="/teachers/add" replace />} />
        <Route path="/teachers-list" element={<Navigate to="/teachers" replace />} />

        {/* Students Management */}
        <Route
          path="/students"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <StudentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/add"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <AddStudent />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------- */}
        {/* ONLINE EXAMINATION SYSTEM ROUTES                              */}
        {/* ------------------------------------------------------------- */}
        
        {/* Examination Hub / List (All logged-in roles) */}
        <Route
          path="/exams"
          element={
            <ProtectedRoute>
              <ExamList />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Live Exams Center (Phase 4) */}
        <Route
          path="/exams/live"
          element={
            <ProtectedRoute>
              <LiveExamsSection />
            </ProtectedRoute>
          }
        />

        {/* Create Examination Wizard (SuperAdmin, Admin, Teacher) */}
        <Route
          path="/exams/create"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <CreateExamWizard />
            </ProtectedRoute>
          }
        />

        {/* Question Paper Builder Canvas */}
        <Route
          path="/exams/:id/builder"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <QuestionPaperBuilder />
            </ProtectedRoute>
          }
        />

        {/* Master Question Papers Hub (Phase 3 & Issue 3) */}
        <Route
          path="/question-papers"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <QuestionPaperList />
            </ProtectedRoute>
          }
        />

        {/* Reusable Question Bank Hub */}
        <Route
          path="/question-bank"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <QuestionBank />
            </ProtectedRoute>
          }
        />

        {/* Paper Approval Workflow (SuperAdmin & Principal/Admin) */}
        <Route
          path="/exams/approvals"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
              <ExamApproval />
            </ProtectedRoute>
          }
        />

        {/* Live Exam Monitor Screen */}
        <Route
          path="/exams/:id/monitor"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <LiveExamMonitor />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Student Examination Interface (Student Portal) */}
        <Route
          path="/exams/:id/take"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ExamErrorBoundary>
                <StudentExamInterface />
              </ExamErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Descriptive Answer Evaluation Screen (Teacher & Admin) */}
        <Route
          path="/exams/evaluations"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <TeacherEvaluation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/:examId/evaluations"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <TeacherEvaluation />
            </ProtectedRoute>
          }
        />

        {/* Results & Performance Analytics Dashboard */}
        <Route
          path="/exams/results"
          element={
            <ProtectedRoute>
              <ExamResultsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/:examId/analytics"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
              <ExamResultsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Individual Student Scorecard / Result View */}
        <Route
          path="/exams/:id/results"
          element={
            <ProtectedRoute>
              <StudentResultView />
            </ProtectedRoute>
          }
        />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

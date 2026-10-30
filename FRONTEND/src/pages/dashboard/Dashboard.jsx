import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  PlusCircle,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  PlayCircle,
  Award,
  RefreshCw,
  Search,
  Eye,
  FileEdit,
  Send,
  XCircle,
  Activity,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import API from '../../api/api.js';
import Sidebar from '../../components/Sidebar.jsx';
import NotificationBell from '../../components/NotificationBell.jsx';

const roleTitles = {
  superadmin: 'Super Admin Dashboard',
  admin: 'Institutional Admin Dashboard',
  teacher: 'Faculty Examination Portal',
  student: 'Student Examination Hub',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || 'student';
  const isAdmin = ['superadmin', 'admin'].includes(role);
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  // Common State
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionAlert, setActionAlert] = useState({ type: '', message: '' });

  // Admin Data State
  const [adminStats, setAdminStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    totalExams: 0,
    scheduledExams: 0,
    liveExams: 0,
  });

  // Teacher Data State
  const [teacherData, setTeacherData] = useState({
    summaryCards: {
      totalExams: 0,
      draftExams: 0,
      scheduledExams: 0,
      liveExams: 0,
      completedExams: 0,
      pendingEvaluations: 0,
      totalAttempts: 0,
    },
    recentExams: [],
  });
  const [teacherTab, setTeacherTab] = useState('all');
  const [teacherSearch, setTeacherSearch] = useState('');

  // Quick Schedule Modal (Teacher)
  const [scheduleModalExam, setScheduleModalExam] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    examDate: '',
    startTime: '',
    endTime: '',
    durationMinutes: 60,
  });
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Student Data State
  const [studentData, setStudentData] = useState({
    summaryCards: {
      availableNow: 0,
      upcoming: 0,
      inProgress: 0,
      completed: 0,
      resultsAvailable: 0,
    },
    exams: [],
    studentInfo: null,
  });
  const [studentTab, setStudentTab] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedExamDetails, setSelectedExamDetails] = useState(null);

  // Live Timer Tick for Upcoming Exam Countdowns
  const [currentTick, setCurrentTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard Metrics Based on Role
  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setErrorMsg('');
    try {
      if (isAdmin) {
        const res = await API.get('/dashboard/admin');
        if (res.data?.success) {
          setAdminStats(res.data.data?.summaryCards || {});
        }
      } else if (isTeacher) {
        const res = await API.get('/dashboard/teacher');
        if (res.data?.success) {
          setTeacherData(res.data.data || {});
        }
      } else if (isStudent) {
        const res = await API.get('/dashboard/student');
        if (res.data?.success) {
          setStudentData(res.data.data || {});
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      if (!isBackground) {
        setErrorMsg(err.response?.data?.message || 'Unable to load live dashboard data. Please try again.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const pollInterval = setInterval(() => {
      loadDashboardData(true);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [role]);

  // -------------------------------------------------------------
  // TEACHER ACTIONS
  // -------------------------------------------------------------
  const openScheduleModal = (exam) => {
    const defaultDate = exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const defaultStart = exam.startTime ? new Date(exam.startTime).toTimeString().slice(0, 5) : '09:00';
    const defaultEnd = exam.endTime ? new Date(exam.endTime).toTimeString().slice(0, 5) : '10:30';

    setScheduleForm({
      examDate: defaultDate,
      startTime: defaultStart,
      endTime: defaultEnd,
      durationMinutes: exam.durationMinutes || 60,
    });
    setScheduleError('');
    setScheduleModalExam(exam);
  };

  const handleConfirmSchedule = async (e) => {
    e.preventDefault();
    setScheduleError('');
    if (!scheduleForm.examDate || !scheduleForm.startTime || !scheduleForm.endTime) {
      setScheduleError('Please provide examination date, start time, and end time.');
      return;
    }

    const startDateTime = new Date(`${scheduleForm.examDate}T${scheduleForm.startTime}:00`);
    const endDateTime = new Date(`${scheduleForm.examDate}T${scheduleForm.endTime}:00`);

    if (endDateTime <= startDateTime) {
      setScheduleError('End time must be later than start time.');
      return;
    }

    if (Number(scheduleForm.durationMinutes) <= 0) {
      setScheduleError('Duration must be greater than 0 minutes.');
      return;
    }

    setSchedulingLoading(true);
    try {
      const res = await API.put(`/exams/${scheduleModalExam._id}/schedule`, {
        examDate: scheduleForm.examDate,
        startTime: startDateTime,
        endTime: endDateTime,
        durationMinutes: Number(scheduleForm.durationMinutes),
      });

      if (res.data?.success) {
        setActionAlert({
          type: 'success',
          message: `Examination "${scheduleModalExam.title}" scheduled successfully. Notifications sent to students.`,
        });
        setScheduleModalExam(null);
        loadDashboardData(true);
      }
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Failed to schedule examination.');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handlePublishExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to officially publish "${exam.title}"? Students will receive notifications.`)) {
      return;
    }
    try {
      const res = await API.put(`/exams/${exam._id}/publish`);
      if (res.data?.success) {
        setActionAlert({
          type: 'success',
          message: `Examination "${exam.title}" published! Eligible students have been notified.`,
        });
        loadDashboardData(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish examination.');
    }
  };

  const handleCancelExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to CANCEL "${exam.title}"?`)) {
      return;
    }
    try {
      const res = await API.put(`/exams/${exam._id}/cancel`);
      if (res.data?.success) {
        setActionAlert({
          type: 'warning',
          message: `Examination "${exam.title}" has been cancelled.`,
        });
        loadDashboardData(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel examination.');
    }
  };

  // Filter Teacher Exams
  const filteredTeacherExams = useMemo(() => {
    return (teacherData.recentExams || []).filter((exam) => {
      if (teacherTab === 'scheduled' && !['scheduled', 'published'].includes(exam.status)) return false;
      if (teacherTab === 'in_progress' && exam.status !== 'in_progress') return false;
      if (teacherTab === 'draft' && !['draft', 'submitted_for_review'].includes(exam.status)) return false;
      if (teacherTab === 'completed' && !['completed', 'results_published'].includes(exam.status)) return false;

      if (teacherSearch) {
        const term = teacherSearch.toLowerCase();
        return (
          exam.title?.toLowerCase().includes(term) ||
          exam.examCode?.toLowerCase().includes(term) ||
          exam.subject?.toLowerCase().includes(term) ||
          exam.classGrade?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [teacherData.recentExams, teacherTab, teacherSearch]);

  // Filter Student Exams
  const filteredStudentExams = useMemo(() => {
    return (studentData.exams || []).filter((exam) => {
      if (studentTab === 'available' && !exam.isAvailableToStart) return false;
      if (studentTab === 'upcoming' && exam.studentStatus !== 'upcoming') return false;
      if (studentTab === 'in_progress' && !exam.isResumable) return false;
      if (studentTab === 'completed' && !exam.hasCompleted) return false;
      if (studentTab === 'results' && !exam.hasResults) return false;

      if (studentSearch) {
        const term = studentSearch.toLowerCase();
        return (
          exam.title?.toLowerCase().includes(term) ||
          exam.examCode?.toLowerCase().includes(term) ||
          exam.subject?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [studentData.exams, studentTab, studentSearch]);

  // Compute countdown string relative to current tick
  const computeCountdown = (targetDateStr) => {
    if (!targetDateStr) return '';
    const diff = Math.max(0, Math.floor((new Date(targetDateStr).getTime() - currentTick) / 1000));
    if (diff === 0) return 'Starting now';
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="badge bg-secondary-subtle text-secondary px-2 py-1"><FileEdit size={12} className="me-1 inline" /> Draft</span>;
      case 'submitted_for_review':
        return <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1"><Clock size={12} className="me-1 inline" /> Pending Review</span>;
      case 'approved':
        return <span className="badge bg-info-subtle text-info px-2 py-1"><CheckCircle2 size={12} className="me-1 inline" /> Approved</span>;
      case 'scheduled':
        return <span className="badge bg-primary-subtle text-primary px-2 py-1"><Calendar size={12} className="me-1 inline" /> Scheduled</span>;
      case 'published':
        return <span className="badge bg-primary text-white px-2 py-1"><Send size={12} className="me-1 inline" /> Published</span>;
      case 'in_progress':
        return <span className="badge bg-success text-white px-2 py-1"><PlayCircle size={12} className="me-1 inline" /> Live Now</span>;
      case 'completed':
        return <span className="badge bg-dark-subtle text-dark px-2 py-1"><CheckCircle2 size={12} className="me-1 inline" /> Completed</span>;
      case 'results_published':
      case 'results_released':
        return <span className="badge bg-success-subtle text-success px-2 py-1 fw-bold"><Award size={12} className="me-1 inline" /> Results Released</span>;
      case 'cancelled':
        return <span className="badge bg-danger-subtle text-danger px-2 py-1"><XCircle size={12} className="me-1 inline" /> Cancelled</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {/* Responsive Inline CSS */}
      <style>{`
        .dashboard-content-wrapper {
          margin-left: 260px;
          padding: 24px 32px;
          transition: margin 0.25s ease-in-out;
        }
        @media (max-width: 991.98px) {
          .dashboard-content-wrapper {
            margin-left: 0 !important;
            padding: 74px 14px 40px 14px !important;
          }
        }
        .dashboard-tabs-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .dashboard-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .kpi-card-hover {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .kpi-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06) !important;
        }
      `}</style>

      <Sidebar user={user} />

      <main className="dashboard-content-wrapper">
        {/* Global Dashboard Header */}
        <header
          className="mb-4 bg-white p-3 p-md-4 rounded-4 shadow-sm border d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3"
          style={{ borderColor: '#e2e8f0' }}
        >
          <div>
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span
                className="badge text-uppercase px-2 py-1 fw-bold"
                style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '10px' }}
              >
                {role}
              </span>
              <span className="text-muted small">• Session 2025-2026</span>
            </div>
            <h1 className="h4 h3-md fw-bold mb-1 text-dark">{roleTitles[role] || 'Dashboard'}</h1>
            <p className="text-secondary small mb-0">
              Welcome back, <strong className="text-dark">{user.name || 'User'}</strong>.
              {isStudent && studentData.studentInfo && (
                <span className="ms-1">
                  ({studentData.studentInfo.classGrade} - Sec {studentData.studentInfo.section || 'A'}, Roll No: {studentData.studentInfo.rollNumber || 'N/A'})
                </span>
              )}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 align-self-end align-self-md-auto">
            <button
              onClick={() => loadDashboardData(false)}
              className="btn btn-light rounded-circle p-2 border shadow-sm d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px', backgroundColor: '#ffffff' }}
              title="Refresh Live Data"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spin text-primary' : 'text-secondary'} />
            </button>

            <NotificationBell
              onSelectExam={(exam) => {
                if (typeof exam === 'object') setSelectedExamDetails(exam);
                else navigate('/exams');
              }}
            />
          </div>
        </header>

        {/* Action Alerts */}
        {actionAlert.message && (
          <div
            className={`alert alert-${actionAlert.type} alert-dismissible fade show border-0 rounded-3 shadow-sm mb-4 p-3`}
            role="alert"
          >
            <div className="d-flex align-items-center gap-2 small fw-semibold">
              <CheckCircle2 size={18} />
              <span>{actionAlert.message}</span>
            </div>
            <button type="button" className="btn-close" onClick={() => setActionAlert({ type: '', message: '' })} />
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-danger border-0 rounded-3 shadow-sm d-flex justify-content-between align-items-center mb-4 p-3">
            <div className="small fw-semibold">{errorMsg}</div>
            <button className="btn btn-outline-danger btn-sm" onClick={() => loadDashboardData(false)}>
              Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STUDENT DASHBOARD                                                         */}
        {/* ========================================================================= */}
        {isStudent && (
          <>
            {/* KPI Metric Cards */}
            <div className="row g-2 g-md-3 mb-4">
              <div className="col-6 col-md-4 col-xl">
                <div
                  className={`card border-0 shadow-sm rounded-4 p-3 h-100 kpi-card-hover ${
                    studentTab === 'available' ? 'border-primary border-2 bg-success-subtle bg-opacity-25' : 'bg-white'
                  }`}
                  style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
                  onClick={() => setStudentTab('available')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Available Now</span>
                      <h3 className="fw-bold text-success mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : studentData.summaryCards.availableNow}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                      <PlayCircle size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl">
                <div
                  className={`card border-0 shadow-sm rounded-4 p-3 h-100 kpi-card-hover ${
                    studentTab === 'upcoming' ? 'border-primary border-2 bg-primary-subtle bg-opacity-25' : 'bg-white'
                  }`}
                  style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
                  onClick={() => setStudentTab('upcoming')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Upcoming</span>
                      <h3 className="fw-bold text-primary mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : studentData.summaryCards.upcoming}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <Clock size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl">
                <div
                  className={`card border-0 shadow-sm rounded-4 p-3 h-100 kpi-card-hover ${
                    studentTab === 'in_progress' ? 'border-warning border-2 bg-warning-subtle bg-opacity-25' : 'bg-white'
                  }`}
                  style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
                  onClick={() => setStudentTab('in_progress')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>In Progress</span>
                      <h3 className="fw-bold text-warning-emphasis mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : studentData.summaryCards.inProgress}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                      <Activity size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-6 col-xl">
                <div
                  className={`card border-0 shadow-sm rounded-4 p-3 h-100 kpi-card-hover ${
                    studentTab === 'completed' ? 'border-secondary border-2 bg-secondary-subtle bg-opacity-25' : 'bg-white'
                  }`}
                  style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
                  onClick={() => setStudentTab('completed')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Completed</span>
                      <h3 className="fw-bold text-dark mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : studentData.summaryCards.completed}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      <CheckCircle2 size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl">
                <div
                  className={`card border-0 shadow-sm rounded-4 p-3 h-100 kpi-card-hover ${
                    studentTab === 'results' ? 'border-info border-2 bg-info-subtle bg-opacity-25' : 'bg-white'
                  }`}
                  style={{ cursor: 'pointer', border: '1px solid #e2e8f0' }}
                  onClick={() => setStudentTab('results')}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Results Ready</span>
                      <h3 className="fw-bold text-info mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : studentData.summaryCards.resultsAvailable}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                      <Award size={22} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduled Examinations Container */}
            <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-white" style={{ borderColor: '#e2e8f0' }}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 pb-3 border-bottom">
                <div>
                  <h2 className="h5 fw-bold text-dark mb-1">Scheduled Examinations</h2>
                  <p className="text-muted small mb-0">
                    Live schedule for {studentData.studentInfo?.classGrade || 'your registered class'}.
                  </p>
                </div>

                {/* Search */}
                <div className="input-group input-group-sm w-100" style={{ maxWidth: '280px' }}>
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={14} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search examination title..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Horizontal Scroll Filter Tabs for Mobile */}
              <div className="dashboard-tabs-scroll mb-4 pb-1">
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${studentTab === 'all' ? 'btn-primary text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={studentTab === 'all' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
                  onClick={() => setStudentTab('all')}
                >
                  All ({studentData.exams.length})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${studentTab === 'available' ? 'btn-success text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={studentTab === 'available' ? { backgroundColor: '#059669', border: 'none' } : {}}
                  onClick={() => setStudentTab('available')}
                >
                  Available Now ({studentData.summaryCards.availableNow})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${studentTab === 'upcoming' ? 'btn-primary text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={studentTab === 'upcoming' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
                  onClick={() => setStudentTab('upcoming')}
                >
                  Upcoming ({studentData.summaryCards.upcoming})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${studentTab === 'in_progress' ? 'btn-warning text-dark shadow-sm' : 'btn-light border text-muted'}`}
                  style={studentTab === 'in_progress' ? { backgroundColor: '#f59e0b', border: 'none' } : {}}
                  onClick={() => setStudentTab('in_progress')}
                >
                  In Progress ({studentData.summaryCards.inProgress})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${studentTab === 'completed' ? 'btn-secondary text-white shadow-sm' : 'btn-light border text-muted'}`}
                  onClick={() => setStudentTab('completed')}
                >
                  Completed ({studentData.summaryCards.completed})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${studentTab === 'results' ? 'btn-info text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={studentTab === 'results' ? { backgroundColor: '#0284c7', border: 'none' } : {}}
                  onClick={() => setStudentTab('results')}
                >
                  Results Released ({studentData.summaryCards.resultsAvailable})
                </button>
              </div>

              {/* Student Exam Cards Grid */}
              {loading ? (
                <div className="row g-3">
                  {[1, 2].map((n) => (
                    <div className="col-12 col-lg-6" key={n}>
                      <div className="card p-4 border rounded-4 bg-light placeholder-glow">
                        <span className="placeholder col-4 mb-2" />
                        <span className="placeholder col-7 mb-3" />
                        <span className="placeholder col-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStudentExams.length === 0 ? (
                <div className="p-4 p-md-5 text-center bg-light rounded-4 border border-dashed">
                  <Calendar size={36} className="text-secondary opacity-50 mx-auto mb-2 d-block" />
                  <h6 className="fw-bold text-dark mb-1">No examinations found</h6>
                  <p className="text-muted small mb-0">
                    {studentTab !== 'all'
                      ? `There are no examinations under the "${studentTab}" filter.`
                      : 'No examinations are scheduled for your class at this time.'}
                  </p>
                </div>
              ) : (
                <div className="row g-3">
                  {filteredStudentExams.map((exam) => {
                    const isUpcoming = exam.studentStatus === 'upcoming';
                    const isLive = exam.isAvailableToStart;
                    const isInProgress = exam.isResumable;
                    const isCompleted = exam.hasCompleted;
                    const hasResult = exam.hasResults;

                    return (
                      <div className="col-12 col-lg-6" key={exam._id}>
                        <div
                          className="card h-100 rounded-4 p-3 p-md-4 shadow-sm position-relative d-flex flex-column justify-content-between"
                          style={{
                            border: isLive ? '1.5px solid #10b981' : isInProgress ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                            backgroundColor: isLive ? '#f0fdf4' : isInProgress ? '#fffbeb' : '#ffffff',
                          }}
                        >
                          <div>
                            {/* Top Badges */}
                            <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                              <div className="d-flex flex-wrap align-items-center gap-1">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                                  {exam.subject}
                                </span>
                                <span className="badge bg-light text-dark border small">
                                  {exam.classGrade}
                                </span>
                              </div>

                              <div>
                                {isLive && (
                                  <span className="badge bg-success text-white px-2 py-1 shadow-sm d-flex align-items-center gap-1">
                                    <span className="spinner-grow spinner-grow-sm" style={{ width: '6px', height: '6px' }} />
                                    Available Now
                                  </span>
                                )}
                                {isUpcoming && (
                                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                    <Clock size={11} className="me-1 inline" />
                                    {computeCountdown(exam.startTime)}
                                  </span>
                                )}
                                {isInProgress && (
                                  <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                                    <Activity size={11} className="me-1 inline" />
                                    In Progress
                                  </span>
                                )}
                                {isCompleted && !hasResult && (
                                  <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                    Submitted
                                  </span>
                                )}
                                {hasResult && (
                                  <span className="badge bg-info-subtle text-info px-2 py-1 fw-bold">
                                    <Award size={11} className="me-1 inline" />
                                    Score Released
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Exam Title */}
                            <h5 className="fw-bold text-dark mb-1 fs-6">{exam.title}</h5>
                            <span className="font-monospace text-muted small d-block mb-3" style={{ fontSize: '11px' }}>
                              Code: {exam.examCode}
                            </span>

                            {/* Meta Grid */}
                            <div className="row g-2 p-2 rounded-3 bg-white border mb-3 small text-secondary" style={{ fontSize: '0.8rem' }}>
                              <div className="col-6">
                                <span className="d-flex align-items-center gap-1">
                                  <Calendar size={13} className="text-primary" />
                                  {exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'TBA'}
                                </span>
                              </div>
                              <div className="col-6">
                                <span className="d-flex align-items-center gap-1">
                                  <Clock size={13} className="text-secondary" />
                                  {exam.startTime ? new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                                </span>
                              </div>
                              <div className="col-6">
                                <span>Duration: <strong className="text-dark">{exam.durationMinutes} mins</strong></span>
                              </div>
                              <div className="col-6">
                                <span>Total Marks: <strong className="text-dark">{exam.totalMarks}</strong></span>
                              </div>
                            </div>

                            {isUpcoming && (
                              <div className="alert alert-primary py-2 px-3 small border-0 mb-3 d-flex align-items-center justify-content-between">
                                <span>Exam starts in:</span>
                                <strong className="font-monospace">{computeCountdown(exam.startTime)}</strong>
                              </div>
                            )}

                            {isInProgress && exam.studentAttempt?.deadline && (
                              <div className="alert alert-warning py-2 px-3 small border-0 mb-3 d-flex align-items-center justify-content-between">
                                <span>Time Remaining:</span>
                                <strong>{computeCountdown(exam.studentAttempt.deadline)}</strong>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-2 pt-2 border-top d-flex flex-wrap gap-2 align-items-center justify-content-between">
                            <button
                              type="button"
                              className="btn btn-light btn-sm rounded-3 border d-flex align-items-center gap-1"
                              onClick={() => setSelectedExamDetails(exam)}
                              style={{ minHeight: '38px' }}
                            >
                              <Eye size={14} /> View Details
                            </button>

                            {isLive && (
                              <button
                                type="button"
                                className="btn btn-success btn-sm rounded-3 d-flex align-items-center gap-1 px-3 shadow-sm fw-semibold"
                                onClick={() => navigate(`/exams/${exam._id}/take`)}
                                style={{ minHeight: '38px', backgroundColor: '#059669', border: 'none' }}
                              >
                                <PlayCircle size={15} /> Start Exam
                              </button>
                            )}

                            {isInProgress && (
                              <button
                                type="button"
                                className="btn btn-warning btn-sm rounded-3 d-flex align-items-center gap-1 px-3 shadow-sm fw-semibold text-dark"
                                onClick={() => navigate(`/exams/${exam._id}/take`)}
                                style={{ minHeight: '38px' }}
                              >
                                <Activity size={15} /> Resume Exam
                              </button>
                            )}

                            {hasResult && (
                              <button
                                type="button"
                                className="btn btn-info text-white btn-sm rounded-3 d-flex align-items-center gap-1 px-3 shadow-sm"
                                onClick={() => navigate(`/exams/${exam._id}/results`)}
                                style={{ minHeight: '38px' }}
                              >
                                <Award size={15} /> Scorecard
                              </button>
                            )}

                            {isCompleted && !hasResult && (
                              <span className="text-muted small d-flex align-items-center gap-1">
                                <CheckCircle2 size={14} className="text-success" /> Submitted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TEACHER DASHBOARD                                                         */}
        {/* ========================================================================= */}
        {isTeacher && (
          <>
            {/* KPI Metric Summary Cards */}
            <div className="row g-2 g-md-3 mb-4">
              <div className="col-6 col-md-4 col-xl">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Total Papers</span>
                      <h3 className="fw-bold text-dark mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : teacherData.summaryCards.totalExams}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <BookOpen size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Scheduled / Live</span>
                      <h3 className="fw-bold text-primary mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : (teacherData.summaryCards.scheduledExams + teacherData.summaryCards.liveExams)}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <Calendar size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Draft Papers</span>
                      <h3 className="fw-bold text-secondary mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : teacherData.summaryCards.draftExams}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      <FileEdit size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-6 col-xl">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Pending Evaluations</span>
                      <h3 className="fw-bold text-warning-emphasis mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : teacherData.summaryCards.pendingEvaluations}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                      <ClipboardCheck size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '10px' }}>Student Submissions</span>
                      <h3 className="fw-bold text-success mb-0 mt-1 fs-4 fs-md-3">
                        {loading ? '...' : teacherData.summaryCards.totalAttempts}
                      </h3>
                    </div>
                    <div className="rounded-3 p-2" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                      <Users size={22} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Strip (Mobile Swipe-scroll) */}
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white" style={{ borderColor: '#e2e8f0' }}>
              <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
                <span className="fw-bold text-dark small text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Quick Shortcuts
                </span>

                <div className="dashboard-tabs-scroll w-100 w-sm-auto">
                  <Link
                    to="/exams/create"
                    className="btn btn-primary btn-sm rounded-3 d-flex align-items-center gap-1 shadow-sm px-3 py-2 fw-semibold"
                    style={{ backgroundColor: '#2563eb', border: 'none', minHeight: '38px' }}
                  >
                    <PlusCircle size={15} /> Create Exam
                  </Link>
                  <Link
                    to="/question-bank"
                    className="btn btn-light btn-sm rounded-3 border d-flex align-items-center gap-1 px-3 py-2"
                    style={{ minHeight: '38px' }}
                  >
                    <BookOpen size={15} className="text-primary" /> Question Bank
                  </Link>
                  <Link
                    to="/exams/evaluations"
                    className="btn btn-light btn-sm rounded-3 border d-flex align-items-center gap-1 px-3 py-2"
                    style={{ minHeight: '38px' }}
                  >
                    <ClipboardCheck size={15} className="text-warning-emphasis" /> Evaluate
                  </Link>
                  <Link
                    to="/exams/results"
                    className="btn btn-light btn-sm rounded-3 border d-flex align-items-center gap-1 px-3 py-2"
                    style={{ minHeight: '38px' }}
                  >
                    <BarChart3 size={15} className="text-info" /> Results
                  </Link>
                </div>
              </div>
            </div>

            {/* Examination Management Section */}
            <div className="card border-0 shadow-sm rounded-4 p-3 p-md-4 mb-4 bg-white" style={{ borderColor: '#e2e8f0' }}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 pb-3 border-bottom">
                <div>
                  <h2 className="h5 fw-bold text-dark mb-1">Examination Management Suite</h2>
                  <p className="text-muted small mb-0">
                    Draft question papers, schedule tests, monitor live submissions, and evaluate answers.
                  </p>
                </div>

                <div className="input-group input-group-sm w-100" style={{ maxWidth: '280px' }}>
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={14} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search by title, subject..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="dashboard-tabs-scroll mb-4 pb-1">
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${teacherTab === 'all' ? 'btn-primary text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={teacherTab === 'all' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
                  onClick={() => setTeacherTab('all')}
                >
                  All ({teacherData.recentExams.length})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${teacherTab === 'scheduled' ? 'btn-primary text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={teacherTab === 'scheduled' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
                  onClick={() => setTeacherTab('scheduled')}
                >
                  Scheduled ({teacherData.summaryCards.scheduledExams})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${teacherTab === 'in_progress' ? 'btn-success text-white shadow-sm' : 'btn-light border text-muted'}`}
                  style={teacherTab === 'in_progress' ? { backgroundColor: '#059669', border: 'none' } : {}}
                  onClick={() => setTeacherTab('in_progress')}
                >
                  Live ({teacherData.summaryCards.liveExams})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${teacherTab === 'draft' ? 'btn-secondary text-white shadow-sm' : 'btn-light border text-muted'}`}
                  onClick={() => setTeacherTab('draft')}
                >
                  Drafts ({teacherData.summaryCards.draftExams})
                </button>
                <button
                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${teacherTab === 'completed' ? 'btn-dark text-white shadow-sm' : 'btn-light border text-muted'}`}
                  onClick={() => setTeacherTab('completed')}
                >
                  Completed ({teacherData.summaryCards.completedExams})
                </button>
              </div>

              {/* Content: Mobile Cards or Desktop Table */}
              {loading ? (
                <div className="p-5 text-center">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="text-muted small mt-2">Loading examinations...</p>
                </div>
              ) : filteredTeacherExams.length === 0 ? (
                <div className="p-4 p-md-5 text-center bg-light rounded-4 border border-dashed">
                  <BookOpen size={36} className="text-secondary opacity-50 mx-auto mb-2 d-block" />
                  <h6 className="fw-bold text-dark mb-1">No examinations found</h6>
                  <p className="text-muted small mb-3">No examinations match your current view.</p>
                  <Link to="/exams/create" className="btn btn-primary btn-sm rounded-3 px-3 py-2 fw-semibold">
                    <PlusCircle size={14} className="me-1 inline" /> Create New Examination
                  </Link>
                </div>
              ) : (
                <>
                  {/* MOBILE VIEW (< 768px): Touch-friendly cards */}
                  <div className="d-block d-md-none">
                    <div className="d-flex flex-column gap-3">
                      {filteredTeacherExams.map((exam) => (
                        <div
                          key={exam._id}
                          className="card border rounded-4 p-3 bg-white shadow-sm"
                          style={{ borderColor: '#e2e8f0' }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.72rem' }}>
                              {exam.examCode}
                            </span>
                            {getStatusBadge(exam.status)}
                          </div>

                          <h6 className="fw-bold text-dark mb-1">{exam.title}</h6>
                          <div className="small text-muted mb-2">
                            {exam.classGrade} • {exam.subject}
                          </div>

                          <div className="d-flex justify-content-between small text-secondary p-2 bg-light rounded-3 mb-3" style={{ fontSize: '0.75rem' }}>
                            <span>Date: <strong>{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'Unscheduled'}</strong></span>
                            <span>Marks: <strong>{exam.totalMarks}</strong></span>
                            <span>Attempts: <strong>{exam.attemptsCount || 0}</strong></span>
                          </div>

                          {/* Action Buttons for Mobile */}
                          <div className="d-grid gap-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm fw-semibold py-2 rounded-3"
                              style={{ backgroundColor: '#2563eb' }}
                              onClick={() => navigate(`/exams/${exam._id}/builder`)}
                            >
                              <FileEdit size={14} className="me-1 inline" /> Edit / Build Questions
                            </button>

                            <div className="d-flex gap-2">
                              {!['in_progress', 'completed'].includes(exam.status) && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm flex-fill py-2 rounded-3"
                                  onClick={() => openScheduleModal(exam)}
                                >
                                  Schedule
                                </button>
                              )}

                              {exam.status === 'draft' && (
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm flex-fill py-2 rounded-3"
                                  onClick={() => handlePublishExam(exam)}
                                >
                                  Publish
                                </button>
                              )}

                              {['scheduled', 'published', 'in_progress'].includes(exam.status) && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm flex-fill py-2 rounded-3"
                                  onClick={() => navigate(`/exams/${exam._id}/monitor`)}
                                >
                                  Monitor
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DESKTOP VIEW (>= 768px): Data Table */}
                  <div className="table-responsive d-none d-md-block">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-muted text-uppercase" style={{ fontSize: '11px' }}>
                          <th>Title & Code</th>
                          <th>Class & Subject</th>
                          <th>Exam Schedule</th>
                          <th>Duration / Marks</th>
                          <th>Status</th>
                          <th>Submissions</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeacherExams.map((exam) => (
                          <tr key={exam._id}>
                            <td>
                              <strong className="text-dark d-block">{exam.title}</strong>
                              <span className="font-monospace text-muted small" style={{ fontSize: '11px' }}>
                                {exam.examCode}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-1">
                                {exam.classGrade}
                              </span>
                              <span className="text-secondary small">{exam.subject}</span>
                            </td>
                            <td>
                              <div className="small">
                                <span className="d-flex align-items-center gap-1 text-dark">
                                  <Calendar size={12} className="text-primary" />
                                  {exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'Unscheduled'}
                                </span>
                                {exam.startTime && (
                                  <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '11px' }}>
                                    <Clock size={11} />
                                    {new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="small d-block">{exam.durationMinutes} mins</span>
                              <span className="text-muted small" style={{ fontSize: '11px' }}>{exam.totalMarks} Marks</span>
                            </td>
                            <td>{getStatusBadge(exam.status)}</td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {exam.attemptsCount || 0} attempts
                              </span>
                              {exam.pendingEvaluationsCount > 0 && (
                                <span className="badge bg-warning-subtle text-warning-emphasis border ms-1">
                                  {exam.pendingEvaluationsCount} eval
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  title="Open Question Paper Builder"
                                  onClick={() => navigate(`/exams/${exam._id}/builder`)}
                                >
                                  Builder
                                </button>

                                {!['in_progress', 'completed'].includes(exam.status) && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    title="Schedule Date & Time"
                                    onClick={() => openScheduleModal(exam)}
                                  >
                                    Schedule
                                  </button>
                                )}

                                {exam.status === 'draft' && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    title="Publish Exam"
                                    onClick={() => handlePublishExam(exam)}
                                  >
                                    Publish
                                  </button>
                                )}

                                {['scheduled', 'published', 'in_progress'].includes(exam.status) && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-info"
                                    title="Live Monitor"
                                    onClick={() => navigate(`/exams/${exam._id}/monitor`)}
                                  >
                                    Monitor
                                  </button>
                                )}

                                {['scheduled', 'published'].includes(exam.status) && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    title="Cancel Exam"
                                    onClick={() => handleCancelExam(exam)}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* ADMIN DASHBOARD                                                           */}
        {/* ========================================================================= */}
        {isAdmin && (
          <section aria-labelledby="institution-overview">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 id="institution-overview" className="h5 fw-semibold text-secondary mb-0">
                Institutional Oversight
              </h2>
              <Link to="/exams/create" className="btn btn-primary btn-sm rounded-3 d-flex align-items-center gap-1 py-2 px-3 fw-semibold">
                <PlusCircle size={15} /> Create Exam
              </Link>
            </div>

            <div className="row g-2 g-md-3 mb-4">
              <div className="col-6 col-sm-6 col-xl-3">
                <div className="card p-3 h-100 border-0 shadow-sm rounded-4 bg-white kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Students</span>
                      <p className="h3 fw-bold text-dark my-1">{loading ? '...' : adminStats.totalStudents}</p>
                    </div>
                    <div className="rounded-3 p-3" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <GraduationCap size={24} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-sm-6 col-xl-3">
                <div className="card p-3 h-100 border-0 shadow-sm rounded-4 bg-white kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Faculty</span>
                      <p className="h3 fw-bold text-dark my-1">{loading ? '...' : adminStats.totalTeachers}</p>
                    </div>
                    <div className="rounded-3 p-3" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <Users size={24} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-sm-6 col-xl-3">
                <div className="card p-3 h-100 border-0 shadow-sm rounded-4 bg-white kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Total Papers</span>
                      <p className="h3 fw-bold text-dark my-1">{loading ? '...' : adminStats.totalExams}</p>
                    </div>
                    <div className="rounded-3 p-3" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                      <BookOpen size={24} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-sm-6 col-xl-3">
                <div className="card p-3 h-100 border-0 shadow-sm rounded-4 bg-white kpi-card-hover" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Scheduled</span>
                      <p className="h3 fw-bold text-primary my-1">{loading ? '...' : adminStats.scheduledExams}</p>
                    </div>
                    <div className="rounded-3 p-3" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <Calendar size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Grid */}
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <Link to="/exams" className="text-decoration-none text-reset">
                  <div className="card h-100 p-3 p-md-4 border-0 shadow-sm rounded-4 bg-white kpi-card-hover">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 p-3" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <h3 className="h6 fw-bold mb-1">Examinations Hub</h3>
                        <p className="text-muted small mb-0">Browse question papers, active schedules, and blueprints.</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col-12 col-md-4">
                <Link to="/exams/approvals" className="text-decoration-none text-reset">
                  <div className="card h-100 p-3 p-md-4 border-0 shadow-sm rounded-4 bg-white kpi-card-hover">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 p-3" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                        <ClipboardCheck size={22} />
                      </div>
                      <div>
                        <h3 className="h6 fw-bold mb-1">Paper Approvals</h3>
                        <p className="text-muted small mb-0">Review submitted tests before scheduling.</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="col-12 col-md-4">
                <Link to="/exams/results" className="text-decoration-none text-reset">
                  <div className="card h-100 p-3 p-md-4 border-0 shadow-sm rounded-4 bg-white kpi-card-hover">
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-3 p-3" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        <BarChart3 size={22} />
                      </div>
                      <div>
                        <h3 className="h6 fw-bold mb-1">Analytics & Results</h3>
                        <p className="text-muted small mb-0">Review performance distributions and release scorecards.</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: QUICK SCHEDULE EXAM (TEACHER)                        */}
        {/* ------------------------------------------------------------- */}
        {scheduleModalExam && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-dialog-centered m-2 m-sm-auto">
              <div className="modal-content rounded-4 border-0 shadow">
                <form onSubmit={handleConfirmSchedule}>
                  <div className="modal-header border-bottom p-3 p-md-4">
                    <div>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-1">
                        {scheduleModalExam.classGrade} • {scheduleModalExam.subject}
                      </span>
                      <h5 className="modal-title fw-bold text-dark fs-6 fs-md-5">Schedule Examination</h5>
                      <p className="text-muted small mb-0">{scheduleModalExam.title}</p>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setScheduleModalExam(null)} />
                  </div>

                  <div className="modal-body p-3 p-md-4">
                    {scheduleError && (
                      <div className="alert alert-danger py-2 px-3 small border-0 rounded-3 mb-3">
                        {scheduleError}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Examination Date *</label>
                      <input
                        type="date"
                        className="form-control rounded-3 py-2"
                        required
                        value={scheduleForm.examDate}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })}
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-secondary">Start Time *</label>
                        <input
                          type="time"
                          className="form-control rounded-3 py-2"
                          required
                          value={scheduleForm.startTime}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-secondary">End Time *</label>
                        <input
                          type="time"
                          className="form-control rounded-3 py-2"
                          required
                          value={scheduleForm.endTime}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Duration (Minutes) *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control rounded-3 py-2"
                        required
                        value={scheduleForm.durationMinutes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: e.target.value })}
                      />
                    </div>

                    <div className="alert alert-info py-2 px-3 small border-0 rounded-3 mb-0">
                      <span className="fw-semibold">Notice:</span> Registered students will receive a push notification for this test.
                    </div>
                  </div>

                  <div className="modal-footer border-top p-3 d-flex justify-content-between">
                    <button type="button" className="btn btn-light rounded-3 px-3 py-2" onClick={() => setScheduleModalExam(null)}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-3 d-flex align-items-center gap-1 shadow-sm px-4 py-2 fw-semibold"
                      style={{ backgroundColor: '#2563eb' }}
                      disabled={schedulingLoading}
                    >
                      {schedulingLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" /> Scheduling...
                        </>
                      ) : (
                        <>
                          <Calendar size={15} /> Confirm & Notify
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: VIEW EXAM DETAILS (STUDENT / TEACHER)                */}
        {/* ------------------------------------------------------------- */}
        {selectedExamDetails && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg m-2 m-sm-auto">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom p-3 p-md-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-1">
                      {selectedExamDetails.classGrade} • {selectedExamDetails.subject}
                    </span>
                    <h5 className="modal-title fw-bold text-dark fs-6 fs-md-5">{selectedExamDetails.title}</h5>
                    <span className="font-monospace text-muted small">Code: {selectedExamDetails.examCode}</span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setSelectedExamDetails(null)} />
                </div>

                <div className="modal-body p-3 p-md-4">
                  <div className="row g-2 mb-4">
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Date</span>
                        <span className="fw-bold text-dark small">
                          {selectedExamDetails.examDate ? new Date(selectedExamDetails.examDate).toLocaleDateString() : 'TBA'}
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Start Time</span>
                        <span className="fw-bold text-dark small">
                          {selectedExamDetails.startTime ? new Date(selectedExamDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Duration</span>
                        <span className="fw-bold text-dark small">{selectedExamDetails.durationMinutes} mins</span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Total Marks</span>
                        <span className="fw-bold text-primary small">{selectedExamDetails.totalMarks} Marks</span>
                      </div>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-2 small">Instructions for Candidate</h6>
                  <div className="p-3 bg-light rounded-3 mb-3 small text-secondary" style={{ whiteSpace: 'pre-line', fontSize: '0.82rem' }}>
                    {selectedExamDetails.instructions || '1. Ensure stable internet.\n2. Do not switch tabs during testing.\n3. Verify all responses before final submit.'}
                  </div>

                  <div className="row g-2 mb-3 text-muted small" style={{ fontSize: '0.8rem' }}>
                    <div className="col-6 col-md-4">
                      Passing Marks: <strong className="text-dark">{selectedExamDetails.passingMarks || 40}</strong>
                    </div>
                    <div className="col-6 col-md-4">
                      Negative Marking: <strong className="text-dark">{selectedExamDetails.negativeMarkingEnabled ? `Yes (-${selectedExamDetails.defaultNegativeMarks})` : 'No'}</strong>
                    </div>
                    <div className="col-6 col-md-4">
                      Tab Switch Limit: <strong className="text-dark">{selectedExamDetails.tabSwitchLimit || 3}</strong>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top p-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-light rounded-3 px-3 py-2" onClick={() => setSelectedExamDetails(null)}>
                    Close
                  </button>

                  {isStudent && selectedExamDetails.isAvailableToStart && (
                    <button
                      type="button"
                      className="btn btn-success rounded-3 d-flex align-items-center gap-2 px-4 py-2 shadow-sm fw-semibold"
                      style={{ backgroundColor: '#059669', border: 'none' }}
                      onClick={() => {
                        setSelectedExamDetails(null);
                        navigate(`/exams/${selectedExamDetails._id}/take`);
                      }}
                    >
                      <PlayCircle size={16} /> Start Exam Now
                    </button>
                  )}

                  {isStudent && selectedExamDetails.isResumable && (
                    <button
                      type="button"
                      className="btn btn-warning rounded-3 d-flex align-items-center gap-2 px-4 py-2 shadow-sm fw-semibold text-dark"
                      onClick={() => {
                        setSelectedExamDetails(null);
                        navigate(`/exams/${selectedExamDetails._id}/take`);
                      }}
                    >
                      <Activity size={16} /> Resume Attempt
                    </button>
                  )}

                  {isStudent && selectedExamDetails.hasResults && (
                    <button
                      type="button"
                      className="btn btn-info text-white rounded-3 d-flex align-items-center gap-2 px-4 py-2 shadow-sm"
                      onClick={() => {
                        setSelectedExamDetails(null);
                        navigate(`/exams/${selectedExamDetails._id}/results`);
                      }}
                    >
                      <Award size={16} /> View Scorecard
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
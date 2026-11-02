import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import examService from '../../services/examService.js';
import {
  FileCheck2,
  PlusCircle,
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  PlayCircle,
  BarChart3,
  Award,
  Send,
  BookOpen,
  Filter,
  Sparkles,
  ChevronRight,
  Layers,
  Radio
} from 'lucide-react';

export default function ExamList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'student';
  const isTeacherOrAdmin = ['teacher', 'admin', 'superadmin', 'principal'].includes(role);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await examService.getExams();
      setExams(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const filteredExams = exams.filter((exam) => {
    if (activeTab === 'scheduled' && !['scheduled', 'published', 'in_progress'].includes(exam.status)) return false;
    if (activeTab === 'review' && exam.status !== 'submitted_for_review') return false;
    if (activeTab === 'draft' && !['draft', 'rejected'].includes(exam.status)) return false;
    if (activeTab === 'results' && !['results_published', 'completed'].includes(exam.status)) return false;

    if (selectedClass && exam.classGrade !== selectedClass) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        exam.title?.toLowerCase().includes(term) ||
        exam.examCode?.toLowerCase().includes(term) ||
        exam.subject?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft', icon: <FileEdit size={12} /> },
      submitted_for_review: { bg: '#fef3c7', color: '#b45309', label: 'Review Pending', icon: <Clock size={12} /> },
      approved: { bg: '#e0f2fe', color: '#0369a1', label: 'Approved', icon: <CheckCircle2 size={12} /> },
      rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Needs Revision', icon: <AlertCircle size={12} /> },
      scheduled: { bg: '#ede9fe', color: '#6d28d9', label: 'Scheduled', icon: <Calendar size={12} /> },
      published: { bg: '#dbeafe', color: '#1d4ed8', label: 'Published', icon: <Send size={12} /> },
      in_progress: { bg: '#dcfce7', color: '#15803d', label: 'Live Now', icon: <PlayCircle size={12} /> },
      completed: { bg: '#f1f5f9', color: '#334155', label: 'Ended', icon: <CheckCircle2 size={12} /> },
      results_published: { bg: '#d1fae5', color: '#047857', label: 'Results Out', icon: <Award size={12} /> },
      cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled', icon: <AlertCircle size={12} /> },
    };

    const current = badges[status] || { bg: '#f1f5f9', color: '#475569', label: status, icon: null };

    return (
      <span
        style={{
          backgroundColor: current.bg,
          color: current.color,
          fontSize: '0.75rem',
          padding: '4px 10px',
          borderRadius: '20px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        {current.icon}
        {current.label}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      {/* Responsive Inline CSS */}
      <style>{`
        .exam-portal-wrapper {
          margin-left: 260px;
          padding: 24px 30px;
          transition: margin 0.25s ease-in-out;
        }
        @media (max-width: 991.98px) {
          .exam-portal-wrapper {
            margin-left: 0 !important;
            padding: 16px 14px 80px 14px !important;
          }
        }
        .scroll-tabs-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .scroll-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .exam-card-hover {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .exam-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>

      <Sidebar user={currentUser} />

      <main className="exam-portal-wrapper">
        {/* Top Header Card */}
        <div
          className="rounded-4 p-3 p-md-4 mb-4"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'inline-flex'
                  }}
                >
                  <BookOpen size={20} />
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-5 fs-md-4">
                  {role === 'student' ? 'My Examinations' : 'Examination Hub'}
                </h4>
              </div>
              <p className="text-secondary small mb-0">
                {role === 'student'
                  ? 'Access your scheduled tests, live exams, and performance scorecards'
                  : 'Design question papers, schedule tests, and evaluate submissions'}
              </p>
            </div>

            {/* Quick Action Button for Teachers */}
            {isTeacherOrAdmin && (
              <div className="w-100 w-md-auto d-flex gap-2">
                <Link
                  to="/exams/create"
                  className="btn btn-primary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-3 shadow-sm w-100 w-md-auto"
                  style={{ backgroundColor: '#2563eb', border: 'none', minHeight: '44px' }}
                >
                  <PlusCircle size={18} />
                  <span>Create Question Paper</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Swipeable Tabs for Mobile / Desktop */}
        <div className="scroll-tabs-container mb-3 pb-1">
          <button
            className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
              activeTab === 'all' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted border'
            }`}
            style={activeTab === 'all' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
            onClick={() => setActiveTab('all')}
          >
            All Papers ({exams.length})
          </button>

          <button
            className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
              activeTab === 'scheduled' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted border'
            }`}
            style={activeTab === 'scheduled' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
            onClick={() => setActiveTab('scheduled')}
          >
            Live & Scheduled ({exams.filter((e) => ['scheduled', 'in_progress'].includes(e.status)).length})
          </button>

          {isTeacherOrAdmin && (
            <>
              <button
                className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
                  activeTab === 'draft' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted border'
                }`}
                style={activeTab === 'draft' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
                onClick={() => setActiveTab('draft')}
              >
                Drafts ({exams.filter((e) => ['draft', 'rejected'].includes(e.status)).length})
              </button>

              <button
                className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
                  activeTab === 'review' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted border'
                }`}
                style={activeTab === 'review' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
                onClick={() => setActiveTab('review')}
              >
                Approval ({exams.filter((e) => e.status === 'submitted_for_review').length})
              </button>
            </>
          )}

          <button
            className={`btn btn-sm px-3 py-2 fw-semibold rounded-pill ${
              activeTab === 'results' ? 'btn-primary text-white shadow-sm' : 'btn-light text-muted border'
            }`}
            style={activeTab === 'results' ? { backgroundColor: '#2563eb', border: 'none' } : {}}
            onClick={() => setActiveTab('results')}
          >
            Results Published ({exams.filter((e) => ['results_published', 'completed'].includes(e.status)).length})
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="row g-2 mb-4">
          <div className="col-12 col-md-8">
            <div
              className="d-flex align-items-center bg-white px-3 py-2 rounded-3 border"
              style={{ minHeight: '44px' }}
            >
              <Search size={18} className="text-muted me-2" />
              <input
                type="text"
                className="form-control border-0 p-0 shadow-none bg-transparent"
                placeholder="Search by exam title, subject, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontSize: '0.9rem' }}
              />
              {searchTerm && (
                <button
                  className="btn btn-sm text-secondary p-0 ms-2"
                  onClick={() => setSearchTerm('')}
                  style={{ textDecoration: 'none' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center bg-white rounded-3 border px-2" style={{ minHeight: '44px' }}>
              <Filter size={16} className="text-muted ms-2 me-1" />
              <select
                className="form-select border-0 shadow-none bg-transparent py-1"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ fontSize: '0.9rem', cursor: 'pointer' }}
              >
                <option value="">Filter by Class (All)</option>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
                {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-secondary fw-semibold small">Fetching examination papers...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger rounded-3 d-flex align-items-center gap-2 p-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <div
            className="text-center p-4 p-md-5 bg-white rounded-4 border"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <FileEdit size={32} />
            </div>
            <h5 className="fw-bold text-dark mb-1">No Examinations Found</h5>
            <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '420px' }}>
              {isTeacherOrAdmin
                ? 'Get started by creating your first question paper with multiple-choice, subjective, or fill-in-the-blank questions.'
                : 'There are no active or scheduled examinations right now. Please check back later.'}
            </p>
            {isTeacherOrAdmin && (
              <Link
                to="/exams/create"
                className="btn btn-primary px-4 py-2 fw-semibold rounded-3 shadow-sm"
                style={{ backgroundColor: '#2563eb' }}
              >
                <PlusCircle size={18} className="me-2 inline" />
                Create First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="row g-3 g-md-4">
            {filteredExams.map((exam) => {
              const totalQuestions =
                exam.examSections?.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) || 0;

              return (
                <div key={exam._id} className="col-12 col-xl-6">
                  <div
                    className="exam-card-hover rounded-4 p-3 p-md-4 bg-white border d-flex flex-column justify-content-between h-100"
                    style={{ borderColor: '#e2e8f0', minHeight: '260px' }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="font-monospace fw-bold"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.78rem'
                            }}
                          >
                            {exam.examCode}
                          </span>
                          <span
                            style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.78rem'
                            }}
                          >
                            {exam.classGrade} {exam.sections?.length ? `(${exam.sections.join(', ')})` : ''}
                          </span>
                        </div>
                        {getStatusBadge(exam.status)}
                      </div>

                      {/* Title & Subject */}
                      <h5 className="fw-bold text-dark mb-1 mt-2 text-truncate" title={exam.title}>
                        {exam.title}
                      </h5>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-secondary-subtle text-secondary fw-semibold">
                          {exam.subject}
                        </span>
                        {totalQuestions > 0 && (
                          <span className="badge bg-light text-dark border">
                            <Layers size={11} className="me-1 inline" />
                            {totalQuestions} Qs
                          </span>
                        )}
                      </div>

                      <p
                        className="text-muted small mb-3"
                        style={{
                          fontSize: '0.84rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {exam.description || 'CBSE standard paper format with section-wise objective and descriptive questions.'}
                      </p>

                      {/* Meta Information Cards (Mobile Touch-Friendly) */}
                      <div
                        className="d-grid gap-2 mb-3 p-2 rounded-3 text-secondary"
                        style={{
                          backgroundColor: '#f8fafc',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div className="d-flex align-items-center gap-1">
                          <Clock size={14} className="text-primary flex-shrink-0" />
                          <span>{exam.durationMinutes || 60} Mins</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <Award size={14} className="text-success flex-shrink-0" />
                          <span>{exam.totalMarks} Marks</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <Calendar size={14} className="text-info flex-shrink-0" />
                          <span>
                            {exam.examDate ? new Date(exam.examDate).toLocaleDateString('en-GB') : 'Flexible'}
                          </span>
                        </div>
                        {exam.negativeMarkingEnabled && (
                          <div className="d-flex align-items-center gap-1 text-danger">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            <span>-{exam.defaultNegativeMarks || 0.5} Neg</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar (Optimized for Mobile Touch) */}
                    <div className="border-top pt-3 mt-2">
                      {/* Student Actions */}
                      {role === 'student' && (
                        <div className="d-grid gap-2">
                          {['scheduled', 'in_progress'].includes(exam.status) && (
                            <Link
                              to={`/exams/${exam._id}/take`}
                              className="btn btn-success fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm rounded-3"
                            >
                              <PlayCircle size={18} />
                              <span>Start / Take Exam Now</span>
                            </Link>
                          )}
                          {exam.status === 'results_published' && (
                            <Link
                              to={`/exams/${exam._id}/results`}
                              className="btn btn-outline-primary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 rounded-3"
                            >
                              <Award size={18} />
                              <span>View Scorecard</span>
                            </Link>
                          )}
                          {['draft', 'submitted_for_review', 'completed'].includes(exam.status) && (
                            <div className="text-center text-muted small py-1">
                              Status: <strong className="text-capitalize">{exam.status.replace(/_/g, ' ')}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Teacher / Admin Actions */}
                      {isTeacherOrAdmin && (
                        <div className="d-flex flex-column gap-2">
                          {/* Primary CTA for Paper Builder */}
                          <div className="row g-2">
                            <div className="col-12 col-sm-6">
                              <Link
                                to={`/exams/${exam._id}/builder`}
                                className="btn btn-primary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 w-100 shadow-sm"
                                style={{ backgroundColor: '#2563eb', border: 'none', fontSize: '0.85rem' }}
                              >
                                <FileEdit size={16} />
                                <span>Build Questions ({totalQuestions})</span>
                              </Link>
                            </div>

                            <div className="col-12 col-sm-6">
                              {exam.status === 'draft' ? (
                                <button
                                  className="btn btn-outline-primary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 w-100"
                                  style={{ fontSize: '0.85rem' }}
                                  onClick={async () => {
                                    try {
                                      await API.put(`/exams/${exam._id}/submit-review`);
                                      fetchExams();
                                    } catch (e) {
                                      alert(e.response?.data?.message || 'Error submitting for review');
                                    }
                                  }}
                                >
                                  <Send size={15} />
                                  <span>Submit for Review</span>
                                </button>
                              ) : ['scheduled', 'in_progress'].includes(exam.status) ? (
                                <Link
                                  to={`/exams/${exam._id}/monitor`}
                                  className="btn btn-outline-danger fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 w-100"
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  <span
                                    className="spinner-grow spinner-grow-sm text-danger"
                                    role="status"
                                    style={{ width: '8px', height: '8px' }}
                                  />
                                  <span>Live Monitor</span>
                                </Link>
                              ) : (
                                <Link
                                  to={`/exams/${exam._id}/evaluations`}
                                  className="btn btn-outline-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 w-100"
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  <FileCheck2 size={15} />
                                  <span>Evaluate Submissions</span>
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Secondary Quick Links */}
                          <div className="d-flex justify-content-between align-items-center pt-2">
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Created: {exam.createdBy?.name || 'Faculty'}
                            </small>
                            <div className="d-flex gap-2">
                              {['superadmin', 'admin'].includes(role) && exam.status === 'submitted_for_review' && (
                                <Link
                                  to={`/exams/approvals?examId=${exam._id}`}
                                  className="btn btn-warning btn-sm fw-semibold rounded-2 py-1 px-2"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  Review Paper
                                </Link>
                              )}
                              <Link
                                to={`/exams/${exam._id}/analytics`}
                                className="btn btn-light btn-sm text-secondary border fw-semibold rounded-2 py-1 px-2 d-flex align-items-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                              >
                                <BarChart3 size={13} /> Analytics
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
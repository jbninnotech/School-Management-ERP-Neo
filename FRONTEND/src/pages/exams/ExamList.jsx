import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  FileCheck2,
  PlusCircle,
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileEdit,
  PlayCircle,
  BarChart3,
  Award,
  ShieldCheck,
  Send,
  BookOpen
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

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await API.get('/exams');
      setExams(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const filteredExams = exams.filter((exam) => {
    // Tab filter
    if (activeTab === 'scheduled' && !['scheduled', 'in_progress'].includes(exam.status)) return false;
    if (activeTab === 'review' && exam.status !== 'submitted_for_review') return false;
    if (activeTab === 'draft' && !['draft', 'rejected'].includes(exam.status)) return false;
    if (activeTab === 'results' && !['results_published', 'completed'].includes(exam.status)) return false;

    // Class filter
    if (selectedClass && exam.classGrade !== selectedClass) return false;

    // Search term
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
    switch (status) {
      case 'draft':
        return <span className="badge bg-secondary-subtle text-secondary px-2 py-1"><FileEdit size={12} className="me-1 inline" /> Draft</span>;
      case 'submitted_for_review':
        return <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1"><Clock size={12} className="me-1 inline" /> Pending Approval</span>;
      case 'approved':
        return <span className="badge bg-info-subtle text-info px-2 py-1"><CheckCircle2 size={12} className="me-1 inline" /> Approved</span>;
      case 'rejected':
        return <span className="badge bg-danger-subtle text-danger px-2 py-1"><AlertCircle size={12} className="me-1 inline" /> Revision Required</span>;
      case 'scheduled':
        return <span className="badge bg-primary-subtle text-primary px-2 py-1"><Calendar size={12} className="me-1 inline" /> Scheduled</span>;
      case 'in_progress':
        return <span className="badge bg-success text-white px-2 py-1 animate-pulse"><PlayCircle size={12} className="me-1 inline" /> In Progress / Live</span>;
      case 'completed':
        return <span className="badge bg-dark-subtle text-dark px-2 py-1"><CheckCircle2 size={12} className="me-1 inline" /> Completed</span>;
      case 'results_published':
        return <span className="badge bg-success-subtle text-success px-2 py-1 fw-bold"><Award size={12} className="me-1 inline" /> Results Published</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>

        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark">
              {role === 'student' ? 'My Examination Portal' : 'Online Examination Hub'}
            </h3>
            <p className="text-muted small mb-0">
              {role === 'student'
                ? 'View scheduled tests, active online examination windows, and official scorecards'
                : 'Prepare question papers, schedule tests, review drafts, and manage competitive exams'}
            </p>
          </div>
          {role !== 'student' && (
            <Link
              to="/exams/create"
              className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 rounded-3 shadow-sm"
              style={{ backgroundColor: '#2563eb' }}
            >
              <PlusCircle size={16} /> Create New Examination
            </Link>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-2">
          <button
            className={`btn btn-sm rounded-3 fw-semibold ${activeTab === 'all' ? 'btn-primary' : 'btn-light text-secondary'}`}
            onClick={() => setActiveTab('all')}
          >
            All Examinations ({exams.length})
          </button>
          <button
            className={`btn btn-sm rounded-3 fw-semibold ${activeTab === 'scheduled' ? 'btn-primary' : 'btn-light text-secondary'}`}
            onClick={() => setActiveTab('scheduled')}
          >
            Active & Scheduled ({exams.filter((e) => ['scheduled', 'in_progress'].includes(e.status)).length})
          </button>
          {role !== 'student' && (
            <>
              <button
                className={`btn btn-sm rounded-3 fw-semibold ${activeTab === 'review' ? 'btn-primary' : 'btn-light text-secondary'}`}
                onClick={() => setActiveTab('review')}
              >
                Needs Approval ({exams.filter((e) => e.status === 'submitted_for_review').length})
              </button>
              <button
                className={`btn btn-sm rounded-3 fw-semibold ${activeTab === 'draft' ? 'btn-primary' : 'btn-light text-secondary'}`}
                onClick={() => setActiveTab('draft')}
              >
                Drafts & Revisions ({exams.filter((e) => ['draft', 'rejected'].includes(e.status)).length})
              </button>
            </>
          )}
          <button
            className={`btn btn-sm rounded-3 fw-semibold ${activeTab === 'results' ? 'btn-primary' : 'btn-light text-secondary'}`}
            onClick={() => setActiveTab('results')}
          >
            Published Results ({exams.filter((e) => ['results_published', 'completed'].includes(e.status)).length})
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-8">
            <div className="input-group bg-white rounded-3 shadow-sm border">
              <span className="input-group-text bg-transparent border-0"><Search size={16} className="text-muted" /></span>
              <input
                type="text"
                className="form-control border-0"
                placeholder="Search examination title, subject, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn btn-link text-muted" onClick={() => setSearchTerm('')}>Clear</button>
              )}
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select bg-white shadow-sm"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
              {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Exams List Card Container */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted small">Loading examination schedule...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : filteredExams.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <BookOpen size={48} className="text-secondary opacity-50 mx-auto mb-3" />
            <h5 className="fw-semibold text-dark">No examinations found</h5>
            <p className="text-muted small">
              {role === 'student'
                ? 'You do not have any examinations assigned matching the selected filters.'
                : 'Click "Create New Examination" to prepare and schedule your first assessment.'}
            </p>
          </div>
        ) : (
          <div className="row g-4">
            {filteredExams.map((exam) => (
              <div key={exam._id} className="col-12 col-xl-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white p-4 d-flex flex-column justify-content-between">
                  <div>
                    {/* Top Tag & Status */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                          {exam.examCode}
                        </span>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          {exam.classGrade} - Sec {Array.isArray(exam.sections) ? exam.sections.join(', ') : 'A'}
                        </span>
                      </div>
                      {getStatusBadge(exam.status)}
                    </div>

                    {/* Title & Subject */}
                    <h5 className="fw-bold text-dark mt-2 mb-1">{exam.title}</h5>
                    <p className="text-secondary small fw-semibold mb-2">{exam.subject}</p>
                    <p className="text-muted small text-truncate-2 mb-3" style={{ fontSize: '0.84rem' }}>
                      {exam.description || 'CBSE standard test format with objective and subjective sections.'}
                    </p>

                    {/* Metadata Badges */}
                    <div className="d-flex flex-wrap gap-3 p-2 rounded-3 bg-light text-secondary small mb-3">
                      <div className="d-flex align-items-center gap-1">
                        <Clock size={14} className="text-primary" />
                        <span>{exam.durationMinutes} Mins</span>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <Award size={14} className="text-success" />
                        <span>{exam.totalMarks} Marks (Pass: {exam.passingMarks})</span>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <Calendar size={14} className="text-info" />
                        <span>{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'TBD'}</span>
                      </div>
                      {exam.negativeMarkingEnabled && (
                        <div className="d-flex align-items-center gap-1 text-danger">
                          <AlertCircle size={14} />
                          <span>Neg: -{exam.defaultNegativeMarks || 0.5}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar based on Role & Status */}
                  <div className="border-top pt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <small className="text-muted">
                      Created by: <strong>{exam.createdBy?.name || 'Faculty'}</strong>
                    </small>

                    <div className="d-flex align-items-center gap-2">
                      {/* STUDENT ACTIONS */}
                      {role === 'student' && (
                        <>
                          {['scheduled', 'in_progress'].includes(exam.status) && (
                            <Link
                              to={`/exams/${exam._id}/take`}
                              className="btn btn-success btn-sm px-3 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                            >
                              <PlayCircle size={15} /> Take Exam Now
                            </Link>
                          )}
                          {exam.status === 'results_published' && (
                            <Link
                              to={`/exams/${exam._id}/results`}
                              className="btn btn-outline-primary btn-sm px-3 fw-semibold d-flex align-items-center gap-1"
                            >
                              <Award size={15} /> View Scorecard
                            </Link>
                          )}
                          {exam.status === 'completed' && (
                            <span className="badge bg-warning-subtle text-warning-emphasis p-2">
                              Awaiting Result Publication
                            </span>
                          )}
                        </>
                      )}

                      {/* TEACHER & PRINCIPAL ACTIONS */}
                      {role !== 'student' && (
                        <>
                          {/* Paper Builder */}
                          <Link
                            to={`/exams/${exam._id}/builder`}
                            className="btn btn-outline-secondary btn-sm px-2 fw-semibold d-flex align-items-center gap-1"
                            title="Question Paper Builder"
                          >
                            <FileEdit size={14} /> Questions ({exam.examSections?.reduce((a, s) => a + (s.questions?.length || 0), 0) || 0})
                          </Link>

                          {/* Approval / Review */}
                          {['superadmin', 'admin'].includes(role) && exam.status === 'submitted_for_review' && (
                            <Link
                              to={`/exams/approvals?examId=${exam._id}`}
                              className="btn btn-warning btn-sm px-2 fw-semibold d-flex align-items-center gap-1"
                            >
                              <CheckCircle2 size={14} /> Review Paper
                            </Link>
                          )}

                          {/* Submit for Review (Teacher) */}
                          {exam.status === 'draft' && (
                            <button
                              className="btn btn-primary btn-sm px-2 fw-semibold d-flex align-items-center gap-1"
                              onClick={async () => {
                                try {
                                  await API.put(`/exams/${exam._id}/submit-review`);
                                  fetchExams();
                                } catch (e) {
                                  alert(e.response?.data?.message || 'Error submitting for review');
                                }
                              }}
                            >
                              <Send size={13} /> Submit for Review
                            </button>
                          )}

                          {/* Evaluations */}
                          {['scheduled', 'in_progress', 'completed', 'results_published'].includes(exam.status) && (
                            <Link
                              to={`/exams/${exam._id}/evaluations`}
                              className="btn btn-outline-primary btn-sm px-2 fw-semibold d-flex align-items-center gap-1"
                            >
                              <FileCheck2 size={14} /> Evaluate
                            </Link>
                          )}

                          {/* Analytics */}
                          <Link
                            to={`/exams/${exam._id}/analytics`}
                            className="btn btn-outline-dark btn-sm px-2 fw-semibold d-flex align-items-center gap-1"
                          >
                            <BarChart3 size={14} /> Analytics
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

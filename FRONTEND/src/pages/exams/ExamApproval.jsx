import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Award,
  BookOpen,
  Search,
  Filter,
  ArrowLeft,
  Layers,
  Sparkles,
  HelpCircle,
  FileCheck,
  Send
} from 'lucide-react';

export default function ExamApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramExamId = searchParams.get('examId');

  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Mobile navigation state: 'queue' or 'inspection'
  const [mobileTab, setMobileTab] = useState('queue');

  const quickRemarks = [
    'Approved - Standard format verified.',
    'Please verify answer key accuracy.',
    'Marks distribution needs balancing.',
    'Typo/formatting corrections needed.'
  ];

  const fetchPendingExams = async () => {
    setLoading(true);
    try {
      const res = await API.get('/exams?status=submitted_for_review');
      const list = res.data?.data || [];
      setExams(list);

      if (paramExamId) {
        const found = list.find((e) => e._id === paramExamId);
        if (found) {
          setSelectedExam(found);
          setMobileTab('inspection');
        } else if (list.length > 0) {
          setSelectedExam(list[0]);
        }
      } else if (list.length > 0 && !selectedExam) {
        setSelectedExam(list[0]);
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.message || 'Failed to load papers' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingExams();
  }, [paramExamId]);

  // Filtered List
  const filteredExams = exams.filter((exam) => {
    if (selectedClass && exam.classGrade !== selectedClass) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        exam.title?.toLowerCase().includes(term) ||
        exam.examCode?.toLowerCase().includes(term) ||
        exam.subject?.toLowerCase().includes(term) ||
        exam.createdBy?.name?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
    setReviewComments('');
    setMobileTab('inspection'); // On mobile switch directly to preview
  };

  const handleReviewAction = async (action) => {
    if (action === 'reject' && !reviewComments.trim()) {
      window.alert('Please provide specific revision instructions when returning a question paper.');
      return;
    }
    setActionLoading(true);
    try {
      await API.put(`/exams/${selectedExam._id}/review`, {
        action,
        comments: reviewComments || (action === 'approve' ? 'Approved by Principal' : 'Revision requested'),
      });

      setAlert({
        type: action === 'approve' ? 'success' : 'warning',
        message: `Paper "${selectedExam.title}" has been ${action === 'approve' ? 'Approved' : 'Returned for revision'}.`,
      });
      setReviewComments('');
      setMobileTab('queue');
      fetchPendingExams();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Error processing review action');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      {/* Responsive Styles */}
      <style>{`
        .approval-wrapper {
          margin-left: 260px;
          padding: 24px 32px;
          transition: margin 0.25s ease-in-out;
        }
        @media (max-width: 991.98px) {
          .approval-wrapper {
            margin-left: 0 !important;
            padding: 16px 14px 80px 14px !important;
          }
          .mobile-view-queue {
            display: ${mobileTab === 'queue' ? 'block' : 'none'} !important;
          }
          .mobile-view-inspection {
            display: ${mobileTab === 'inspection' ? 'block' : 'none'} !important;
          }
        }
        .exam-queue-card {
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          border: 1px solid #e2e8f0;
        }
        .exam-queue-card:hover {
          border-color: #93c5fd;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .exam-queue-card.active-exam {
          border-color: #2563eb !important;
          background-color: #eff6ff !important;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12) !important;
        }
      `}</style>

      <Sidebar user={currentUser} />

      <main className="approval-wrapper">
        {/* Header Banner */}
        <div
          className="rounded-4 p-3 p-md-4 mb-4"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
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
                  <FileCheck size={20} />
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-5 fs-md-4">
                  Question Paper Approvals
                </h4>
              </div>
              <p className="text-secondary small mb-0">
                Inspect question syllabus accuracy, mark weightage, and answer keys before exam publishing
              </p>
            </div>

            <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill fw-semibold border border-warning-subtle">
              <Clock size={13} className="me-1 inline" />
              {exams.length} Awaiting Approval
            </span>
          </div>
        </div>

        {/* Global Notifications */}
        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex justify-content-between align-items-center mb-4 p-3`}>
            <div className="d-flex align-items-center gap-2 small fw-semibold">
              {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{alert.message}</span>
            </div>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }} />
            <p className="mt-3 text-secondary small fw-semibold">Loading paper review queue...</p>
          </div>
        ) : exams.length === 0 ? (
          <div
            className="text-center p-4 p-md-5 bg-white rounded-4 border"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h5 className="fw-bold text-dark mb-1">Queue Clear: All Papers Reviewed!</h5>
            <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '400px' }}>
              No question papers are waiting for approval right now. Newly submitted drafts by teachers will show up here.
            </p>
          </div>
        ) : (
          <div className="row g-4">
            {/* ================= LEFT QUEUE COLUMN ================= */}
            <div className="col-12 col-lg-5 col-xl-4 mobile-view-queue">
              <div
                className="bg-white rounded-4 p-3 border mb-3"
                style={{ borderColor: '#e2e8f0' }}
              >
                {/* Search Bar */}
                <div
                  className="d-flex align-items-center bg-light px-3 py-2 rounded-3 border mb-2"
                  style={{ minHeight: '40px' }}
                >
                  <Search size={16} className="text-muted me-2" />
                  <input
                    type="text"
                    className="form-control border-0 p-0 shadow-none bg-transparent"
                    placeholder="Search title, teacher, code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {searchTerm && (
                    <button className="btn btn-sm text-secondary p-0" onClick={() => setSearchTerm('')}>
                      ✕
                    </button>
                  )}
                </div>

                {/* Class Filter */}
                <div className="d-flex align-items-center bg-light rounded-3 border px-2 mb-3">
                  <Filter size={14} className="text-muted ms-2 me-1" />
                  <select
                    className="form-select border-0 shadow-none bg-transparent py-1"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="">All Classes</option>
                    {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div className="d-flex justify-content-between align-items-center px-1 mb-2">
                  <span className="fw-bold text-dark small">Pending Papers</span>
                  <span className="badge bg-secondary-subtle text-secondary">{filteredExams.length}</span>
                </div>

                {/* Queue Cards List */}
                <div
                  className="d-flex flex-column gap-2"
                  style={{ maxHeight: '680px', overflowY: 'auto' }}
                >
                  {filteredExams.map((ex) => {
                    const isSelected = selectedExam?._id === ex._id;
                    const questionCount =
                      ex.examSections?.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) || 0;

                    return (
                      <div
                        key={ex._id}
                        className={`exam-queue-card p-3 rounded-3 ${isSelected ? 'active-exam' : 'bg-white'}`}
                        onClick={() => handleSelectExam(ex)}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span
                            className="font-monospace fw-bold"
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontSize: '0.72rem'
                            }}
                          >
                            {ex.examCode}
                          </span>
                          <span className="badge bg-warning-subtle text-warning-emphasis" style={{ fontSize: '0.7rem' }}>
                            Needs Approval
                          </span>
                        </div>

                        <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '0.88rem' }}>
                          {ex.title}
                        </h6>

                        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                          <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.72rem' }}>
                            {ex.classGrade}
                          </span>
                          <span className="text-secondary small fw-semibold" style={{ fontSize: '0.78rem' }}>
                            {ex.subject}
                          </span>
                        </div>

                        <div
                          className="d-flex justify-content-between align-items-center pt-2 border-top text-muted"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <span className="d-flex align-items-center gap-1">
                            <User size={12} />
                            <strong>{ex.createdBy?.name || 'Faculty'}</strong>
                          </span>
                          <span>
                            <strong>{ex.totalMarks}</strong> M / <strong>{questionCount}</strong> Qs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ================= RIGHT PAPER INSPECTION ================= */}
            {selectedExam && (
              <div className="col-12 col-lg-7 col-xl-8 mobile-view-inspection">
                <div
                  className="card border-0 rounded-4 bg-white p-3 p-md-4 shadow-sm"
                  style={{ border: '1px solid #e2e8f0' }}
                >
                  {/* Mobile Back to Queue Button */}
                  <div className="d-block d-lg-none mb-3">
                    <button
                      className="btn btn-outline-secondary btn-sm fw-semibold d-flex align-items-center gap-2 rounded-3 w-100 py-2"
                      onClick={() => setMobileTab('queue')}
                    >
                      <ArrowLeft size={16} /> Back to Papers Queue
                    </button>
                  </div>

                  {/* Paper Header Card */}
                  <div className="border-bottom pb-3 mb-4">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"
                            style={{ fontSize: '0.78rem' }}
                          >
                            {selectedExam.classGrade} • {selectedExam.subject}
                          </span>
                          <span className="badge bg-light text-dark border font-monospace px-2 py-1" style={{ fontSize: '0.78rem' }}>
                            {selectedExam.examCode}
                          </span>
                        </div>
                        <h4 className="fw-bold text-dark mb-1 fs-5 fs-md-4">{selectedExam.title}</h4>
                        <div className="small text-muted d-flex align-items-center gap-1">
                          <User size={13} />
                          <span>
                            Prepared by: <strong>{selectedExam.createdBy?.name || 'Teacher'}</strong> ({selectedExam.createdBy?.email || 'N/A'})
                          </span>
                        </div>
                      </div>

                      <div className="d-flex d-md-flex flex-row flex-md-column gap-1 text-md-end">
                        <span className="badge bg-success-subtle text-success fs-6 px-3 py-1 fw-bold">
                          {selectedExam.totalMarks} Total Marks
                        </span>
                        <span className="text-muted small ps-1">{selectedExam.durationMinutes} Minutes Window</span>
                      </div>
                    </div>
                  </div>

                  {/* Question Content View */}
                  <div
                    className="mb-4 pe-1"
                    style={{ maxHeight: '520px', overflowY: 'auto' }}
                  >
                    {(!selectedExam.examSections || selectedExam.examSections.length === 0) ? (
                      <div className="text-center py-4 bg-light rounded-3 text-muted small">
                        This examination has no questions uploaded yet.
                      </div>
                    ) : (
                      selectedExam.examSections.map((sec, sIdx) => (
                        <div key={sec.id || sIdx} className="mb-4">
                          <div
                            className="p-2 px-3 rounded-3 mb-3 d-flex align-items-center justify-content-between"
                            style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb' }}
                          >
                            <span className="fw-bold text-dark text-uppercase small">
                              {sec.title}
                            </span>
                            <span className="badge bg-white text-primary border small">
                              {sec.questions?.length || 0} Questions
                            </span>
                          </div>

                          <div className="d-flex flex-column gap-3">
                            {sec.questions?.map((q, qIdx) => (
                              <div
                                key={qIdx}
                                className="p-3 rounded-3 border bg-light bg-opacity-50"
                                style={{ borderColor: '#e2e8f0' }}
                              >
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold text-dark">Q{qIdx + 1}.</span>
                                    <span className="badge bg-white text-secondary border text-capitalize" style={{ fontSize: '0.72rem' }}>
                                      {q.questionType?.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <span className="badge bg-success-subtle text-success fw-bold">
                                    +{q.marks} Marks
                                  </span>
                                </div>

                                <div className="text-dark fw-medium mb-3" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                  {q.questionText}
                                </div>

                                {/* MCQ / Options */}
                                {['single_mcq', 'multiple_select', 'assertion_reason'].includes(q.questionType) && q.options && (
                                  <div className="row g-2 mb-3">
                                    {q.options.map((opt, oIdx) => {
                                      const isCorrect = Array.isArray(q.correctAnswer)
                                        ? q.correctAnswer.includes(opt.id)
                                        : q.correctAnswer === opt.id;
                                      return (
                                        <div key={oIdx} className="col-12 col-md-6">
                                          <div
                                            className="p-2 rounded-2 border small"
                                            style={{
                                              backgroundColor: isCorrect ? '#ecfdf5' : '#ffffff',
                                              borderColor: isCorrect ? '#10b981' : '#e2e8f0',
                                              color: isCorrect ? '#065f46' : '#334155',
                                              fontWeight: isCorrect ? 600 : 400
                                            }}
                                          >
                                            <strong>({String.fromCharCode(65 + oIdx)})</strong> {opt.text}
                                            {isCorrect && ' ✓ [Key]'}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Target Key & Teacher Rationale */}
                                <div
                                  className="p-2 rounded-2 small"
                                  style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}
                                >
                                  <div className="text-secondary">
                                    <strong className="text-dark">Official Key: </strong>
                                    <span className="badge bg-success-subtle text-success">
                                      {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                                    </span>
                                  </div>
                                  {q.explanation && (
                                    <div className="text-muted mt-1" style={{ fontSize: '0.78rem' }}>
                                      <strong>Rationale:</strong> {q.explanation}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Decision & Feedback Box */}
                  <div
                    className="p-3 rounded-4 border"
                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                  >
                    <label className="form-label small fw-bold text-dark mb-1">
                      Reviewer Feedback / Revision Notes
                    </label>

                    {/* Quick remark chips */}
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {quickRemarks.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-sm btn-white border bg-white rounded-pill text-muted px-2 py-0"
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => setReviewComments(chip)}
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows="2"
                      className="form-control mb-3"
                      placeholder="Add specific observations or approval notes for the teacher..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      style={{ fontSize: '0.88rem' }}
                    />

                    {/* Action Buttons (Stacked on mobile, row on desktop) */}
                    <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-danger fw-semibold d-flex align-items-center justify-content-center gap-1 py-2 px-3 rounded-3"
                        onClick={() => handleReviewAction('reject')}
                        disabled={actionLoading}
                        style={{ minHeight: '42px' }}
                      >
                        <XCircle size={16} /> Request Revision
                      </button>

                      <button
                        type="button"
                        className="btn btn-success fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 px-4 rounded-3 shadow-sm"
                        onClick={() => handleReviewAction('approve')}
                        disabled={actionLoading}
                        style={{ minHeight: '42px' }}
                      >
                        {actionLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            <span>Approve Question Paper</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Calendar,
  Award,
  BookOpen
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

  const fetchPendingExams = async () => {
    setLoading(true);
    try {
      const res = await API.get('/exams?status=submitted_for_review');
      const list = res.data?.data || [];
      setExams(list);

      if (paramExamId) {
        const found = list.find((e) => e._id === paramExamId);
        if (found) setSelectedExam(found);
        else if (list.length > 0) setSelectedExam(list[0]);
      } else if (list.length > 0) {
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

  const handleReviewAction = async (action) => {
    if (action === 'reject' && !reviewComments.trim()) {
      window.alert('Please provide specific feedback/revision instructions when returning a question paper.');
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
        message: `Question paper for "${selectedExam.title}" has been ${action === 'approve' ? 'approved' : 'returned for revision'}.`,
      });
      setReviewComments('');
      fetchPendingExams();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Error processing review action');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>

        {/* Header */}
        <div className="mb-4 pb-3 border-bottom">
          <h3 className="fw-bold mb-1 text-dark">Question Paper Approval Workflow</h3>
          <p className="text-muted small mb-0">
            Principal & SuperAdmin review gatekeeper: Inspect question quality, syllabus adherence, and answer key accuracy before scheduling
          </p>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex justify-content-between align-items-center mb-4`}>
            <div>{alert.message}</div>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted small">Loading review queue...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <CheckCircle2 size={44} className="text-success mx-auto mb-2 opacity-75" />
            <h5 className="fw-semibold text-dark">Queue Clear: No Papers Awaiting Approval</h5>
            <p className="text-muted small mb-0">All submitted question papers have been reviewed and approved.</p>
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Left Queue List */}
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
                <h6 className="fw-bold text-dark px-2 mb-3">Pending Review ({exams.length})</h6>
                <div className="d-flex flex-column gap-2">
                  {exams.map((ex) => (
                    <div
                      key={ex._id}
                      className={`p-3 rounded-3 border transition-all cursor-pointer ${
                        selectedExam?._id === ex._id
                          ? 'bg-primary-subtle border-primary shadow-sm'
                          : 'bg-light border-light'
                      }`}
                      onClick={() => {
                        setSelectedExam(ex);
                        setReviewComments('');
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="badge bg-white text-dark border font-monospace" style={{ fontSize: '0.7rem' }}>
                          {ex.examCode}
                        </span>
                        <span className="badge bg-warning-subtle text-warning-emphasis" style={{ fontSize: '0.7rem' }}>
                          Needs Review
                        </span>
                      </div>
                      <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '0.9rem' }}>{ex.title}</h6>
                      <div className="small text-muted mb-1">{ex.classGrade} • {ex.subject}</div>
                      <div className="d-flex justify-content-between small text-secondary" style={{ fontSize: '0.75rem' }}>
                        <span>By: {ex.createdBy?.name || 'Faculty'}</span>
                        <span>{ex.totalMarks} Marks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Paper Inspection Workspace */}
            {selectedExam && (
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                  
                  {/* Paper Header Banner */}
                  <div className="border-bottom pb-3 mb-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {selectedExam.classGrade} • {selectedExam.subject}
                          </span>
                          <span className="badge bg-light text-dark border font-monospace">
                            {selectedExam.examCode}
                          </span>
                        </div>
                        <h4 className="fw-bold text-dark mb-1">{selectedExam.title}</h4>
                        <div className="small text-muted">
                          Prepared by: <strong>{selectedExam.createdBy?.name}</strong> ({selectedExam.createdBy?.email})
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="badge bg-success-subtle text-success fs-6 px-3 py-1 mb-1">
                          {selectedExam.totalMarks} Marks
                        </div>
                        <div className="small text-muted">{selectedExam.durationMinutes} Minutes</div>
                      </div>
                    </div>
                  </div>

                  {/* Question Paper Content Review */}
                  <div className="mb-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {selectedExam.examSections?.map((sec, sIdx) => (
                      <div key={sec.id || sIdx} className="mb-4">
                        <div className="bg-light p-2 rounded-2 border-start border-4 border-primary mb-3">
                          <span className="fw-bold text-dark text-uppercase">{sec.title}</span>
                          <span className="text-muted small ms-2">({sec.questions?.length || 0} Questions)</span>
                        </div>

                        <div className="d-flex flex-column gap-3 ps-2">
                          {sec.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="border-bottom pb-3">
                              <div className="d-flex justify-content-between">
                                <span className="fw-semibold text-dark">
                                  Q{qIdx + 1}. <span className="badge bg-light text-secondary border ms-1">{q.questionType?.replace('_', ' ')}</span>
                                </span>
                                <span className="badge bg-success-subtle text-success">+{q.marks} Marks</span>
                              </div>
                              <div className="mt-1 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                                {q.questionText}
                              </div>

                              {/* Options */}
                              {['single_mcq', 'multiple_select', 'assertion_reason'].includes(q.questionType) && q.options && (
                                <div className="row g-2 mt-2 ps-2">
                                  {q.options.map((opt, oIdx) => {
                                    const isCorrect = Array.isArray(q.correctAnswer)
                                      ? q.correctAnswer.includes(opt.id)
                                      : q.correctAnswer === opt.id;
                                    return (
                                      <div key={oIdx} className="col-md-6 small">
                                        <div className={`p-1 px-2 rounded-2 border ${isCorrect ? 'bg-success-subtle border-success text-success fw-bold' : 'bg-light text-secondary'}`}>
                                          ({String.fromCharCode(65 + oIdx)}) {opt.text}
                                          {isCorrect && ' ✓ [Key]'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Key & Explanation */}
                              <div className="mt-2 p-2 bg-light rounded-2 small text-secondary">
                                <div><strong>Target Key: </strong>{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}</div>
                                {q.explanation && <div className="text-muted mt-1">Rationale: {q.explanation}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Principal Decision Box */}
                  <div className="p-3 bg-light rounded-3 border">
                    <label className="form-label small fw-semibold text-dark mb-1">
                      Review Comments / Feedback to Teacher
                    </label>
                    <textarea
                      rows="2"
                      className="form-control form-control-sm mb-3"
                      placeholder="Add feedback or specific revision points..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                    />
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm px-3 fw-semibold d-flex align-items-center gap-1"
                        onClick={() => handleReviewAction('reject')}
                        disabled={actionLoading}
                      >
                        <XCircle size={15} /> Request Revision
                      </button>
                      <button
                        type="button"
                        className="btn btn-success btn-sm px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => handleReviewAction('approve')}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 size={15} /> Approve Question Paper
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

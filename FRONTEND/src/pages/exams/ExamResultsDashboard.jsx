import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  BarChart3,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Printer,
  Share2,
  Send,
  Eye,
  AlertCircle
} from 'lucide-react';

export default function ExamResultsDashboard() {
  const { examId } = useParams();
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'student';

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examId || '');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch available exams list
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await API.get('/exams');
        const list = res.data?.data || [];
        setExams(list);
        if (!selectedExamId && list.length > 0) {
          setSelectedExamId(list[0]._id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, []);

  // 2. Fetch Analytics for selected exam
  const fetchAnalytics = async (eid) => {
    if (!eid) return;
    setLoading(true);
    try {
      const res = await API.get(`/exams/${eid}/analytics`);
      setAnalytics(res.data?.data);
    } catch (err) {
      setAlert({ type: 'danger', message: err.response?.data?.message || err.message || 'Error fetching analytics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalytics(selectedExamId);
    }
  }, [selectedExamId]);

  // Publish / Unpublish results toggle
  const handleTogglePublish = async (publish) => {
    if (!selectedExamId) return;
    setPublishing(true);
    try {
      await API.post(`/exams/${selectedExamId}/publish`, { publish });
      setAlert({
        type: 'success',
        message: `Examination results have been ${publish ? 'officially published to students' : 'hidden'}!`,
      });
      fetchAnalytics(selectedExamId);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Error updating publication status');
    } finally {
      setPublishing(false);
    }
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    if (!analytics || !analytics.candidateRankings) return;
    const headers = ['Rank', 'Student Name', 'School ID', 'Roll Number', 'Score', 'Max Marks', 'Percentage', 'Result Status', 'Submission Date'];
    const rows = analytics.candidateRankings.map((c) => [
      c.rank,
      `"${c.studentName}"`,
      c.schoolId,
      c.rollNumber,
      c.score,
      analytics.summary?.maxMarks,
      `${c.percentage}%`,
      c.isPassed ? 'PASSED' : 'FAILED',
      c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${analytics.exam?.examCode || 'EXAM'}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analytics?.summary || {};
  const exam = analytics?.exam || {};
  const isPublished = exam.status === 'results_published';

  const filteredRankings = (analytics?.candidateRankings || []).filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.studentName?.toLowerCase().includes(term) ||
      c.rollNumber?.toLowerCase().includes(term) ||
      c.schoolId?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>

        {/* Header Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark">Results Management & Analytics</h3>
            <p className="text-muted small mb-0">
              Class performance overview, accuracy metrics, student rankings, and official scorecard publication
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-3">
            <select
              className="form-select form-select-sm bg-white shadow-sm"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ minWidth: '260px' }}
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.title} ({ex.classGrade})
                </option>
              ))}
            </select>

            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex justify-content-between align-items-center mb-4`}>
            <div>{alert.message}</div>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        {/* Publication Control Banner for Principal & SuperAdmin */}
        {['superadmin', 'admin'].includes(role) && (
          <div className={`card border-0 shadow-sm rounded-4 p-3 mb-4 ${isPublished ? 'bg-success-subtle border-success' : 'bg-warning-subtle'}`}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                {isPublished ? <CheckCircle2 size={24} className="text-success" /> : <AlertCircle size={24} className="text-warning-emphasis" />}
                <div>
                  <h6 className="fw-bold mb-0 text-dark">
                    {isPublished ? 'Results are Officially Published' : 'Results are Currently Private / Unpublished'}
                  </h6>
                  <small className="text-muted">
                    {isPublished
                      ? 'Students are permitted to view their scorecards, performance metrics, and answer key reviews.'
                      : 'Students cannot see their results until authorized publication is triggered by Principal.'}
                  </small>
                </div>
              </div>

              <div>
                {isPublished ? (
                  <button
                    className="btn btn-outline-danger btn-sm fw-semibold"
                    onClick={() => handleTogglePublish(false)}
                    disabled={publishing}
                  >
                    Unpublish Results
                  </button>
                ) : (
                  <button
                    className="btn btn-success btn-sm fw-bold px-4 shadow-sm"
                    onClick={() => handleTogglePublish(true)}
                    disabled={publishing}
                  >
                    Publish Results to Students Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted small">Computing performance analytics...</p>
          </div>
        ) : !analytics ? (
          <div className="alert alert-info">Please select an examination to view analytics.</div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm p-3 rounded-4 bg-white">
                  <span className="text-muted small fw-semibold text-uppercase">Candidates Appeared</span>
                  <h3 className="fw-bold text-dark my-1">
                    {summary.totalSubmitted} <span className="fs-6 text-muted fw-normal">/ {summary.totalEligible}</span>
                  </h3>
                  <small className="text-muted">{summary.absentCount} Absent Candidates</small>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm p-3 rounded-4 bg-white">
                  <span className="text-muted small fw-semibold text-uppercase">Pass Rate</span>
                  <h3 className="fw-bold text-success my-1">{summary.passPercentage}%</h3>
                  <small className="text-muted">{summary.passedCount} Passed • {summary.failedCount} Failed</small>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm p-3 rounded-4 bg-white">
                  <span className="text-muted small fw-semibold text-uppercase">Average Score</span>
                  <h3 className="fw-bold text-primary my-1 font-monospace">
                    {summary.averageScore} <span className="fs-6 text-muted fw-normal">/ {summary.maxMarks}</span>
                  </h3>
                  <small className="text-muted">Mean Class Performance</small>
                </div>
              </div>

              <div className="col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm p-3 rounded-4 bg-white">
                  <span className="text-muted small fw-semibold text-uppercase">Highest / Lowest</span>
                  <h3 className="fw-bold text-indigo my-1 font-monospace">
                    {summary.highestScore} <span className="fs-6 text-muted fw-normal">/ {summary.lowestScore}</span>
                  </h3>
                  <small className="text-muted">Top Score vs Minimum Score</small>
                </div>
              </div>
            </div>

            {/* Candidate Rankings / Results Table */}
            <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-4">
              <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold text-dark mb-0">Candidate Scorecard Roster</h5>
                  <small className="text-muted">Individual student attempt scores and rankings</small>
                </div>
                <div className="input-group input-group-sm" style={{ width: '250px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search candidate name or roll..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-secondary text-uppercase" style={{ fontSize: '0.72rem' }}>
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th>Candidate Name</th>
                      <th>Roll Number</th>
                      <th>School ID</th>
                      <th>Score Obtained</th>
                      <th>Percentage</th>
                      <th>Pass / Fail</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRankings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4 text-muted">No candidate results matching search.</td>
                      </tr>
                    ) : (
                      filteredRankings.map((c) => (
                        <tr key={c.attemptId}>
                          <td className="py-3 px-4 fw-bold font-monospace">#{c.rank}</td>
                          <td className="fw-semibold text-dark">{c.studentName}</td>
                          <td className="font-monospace text-secondary">{c.rollNumber || '---'}</td>
                          <td className="font-monospace small text-muted">{c.schoolId}</td>
                          <td className="fw-bold text-dark font-monospace">
                            {c.score} <span className="text-muted fw-normal small">/ {summary.maxMarks}</span>
                          </td>
                          <td className="fw-semibold text-primary">{c.percentage}%</td>
                          <td>
                            {c.isPassed ? (
                              <span className="badge bg-success-subtle text-success px-2 py-1">PASSED</span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger px-2 py-1">NEEDS IMPROVEMENT</span>
                            )}
                          </td>
                          <td className="text-center">
                            <Link
                              to={`/exams/${selectedExamId}/results?studentId=${c.attemptId}`}
                              className="btn btn-outline-primary btn-sm py-1 px-2"
                              title="View Individual Report Card"
                            >
                              <Eye size={13} className="me-1 inline" /> Report
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Question Accuracy Breakdown */}
            {analytics.questionPerformance && analytics.questionPerformance.length > 0 && (
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                <h5 className="fw-bold text-dark mb-1">Question-Wise Accuracy & Difficulty Breakdown</h5>
                <p className="text-muted small mb-3">Identifies questions where candidates encountered the highest error rates</p>

                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle">
                    <thead className="table-light small text-secondary">
                      <tr>
                        <th>Section</th>
                        <th>Question</th>
                        <th>Type</th>
                        <th>Attempted</th>
                        <th>Correct Count</th>
                        <th>Accuracy Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.questionPerformance.map((qp, idx) => (
                        <tr key={idx}>
                          <td className="small text-muted">{qp.sectionTitle}</td>
                          <td className="text-dark small text-truncate" style={{ maxWidth: '300px' }}>
                            {qp.questionText}
                          </td>
                          <td>
                            <span className="badge bg-light text-secondary border" style={{ fontSize: '0.65rem' }}>
                              {qp.questionType?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="small font-monospace">{qp.totalAttempted}</td>
                          <td className="small font-monospace text-success">{qp.correctCount}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '6px' }}>
                                <div
                                  className={`progress-bar ${qp.accuracyRate > 70 ? 'bg-success' : qp.accuracyRate > 40 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${qp.accuracyRate}%` }}
                                />
                              </div>
                              <span className="small fw-bold font-monospace" style={{ minWidth: '35px' }}>
                                {qp.accuracyRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

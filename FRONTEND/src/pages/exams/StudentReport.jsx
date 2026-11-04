import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import reportService from '../../services/reportService.js';
import categoryService from '../../services/categoryService.js';
import { formatDateTime12h } from '../../utils/timeUtils.js';
import {
  Award,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudentReport() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [report, setReport] = useState(null);
  const [topicAnalysis, setTopicAnalysis] = useState(null);
  const [drillLevel, setDrillLevel] = useState('unit'); // 'unit' | 'topic' | 'subtopic' | 'child'
  const [topicSearch, setTopicSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [resReport, resAnalysis] = await Promise.all([
        reportService.getStudentReport('me'),
        categoryService.getTopicAnalysis({ search: topicSearch }),
      ]);
      setReport(resReport.data);
      setTopicAnalysis(resAnalysis.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to retrieve performance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [topicSearch]);

  const handleDownloadPDF = async () => {
    try {
      const blob = await reportService.downloadReportPdf('me');
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Student_Report_${report?.student?.name || 'Academic'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      // Fallback to client-side jsPDF if server streaming blocked
      if (!report) return;
      try {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Student Academic Performance Report', 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(
          `Candidate: ${report.student?.name} | Roll #${report.student?.rollNumber || '-'} | Class: ${report.student?.classGrade || '-'}`,
          14,
          28
        );
        doc.text(`Generated: ${formatDateTime12h(new Date())}`, 14, 35);
        doc.save(`Student_Report_${report.student?.name?.replace(/\s+/g, '_') || 'Academic'}.pdf`);
      } catch (e) {
        alert('Failed to generate PDF: ' + e.message);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Sidebar user={user} />
        <main style={{ marginLeft: '260px', padding: '60px', textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Retrieving your authenticated performance records...</p>
        </main>
      </div>
    );
  }

  const { student, summary, subjectBreakdown = [], trendOverTime = [], strengths = [], weakTopics = [], examHistory = [] } =
    report || {};

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <Award size={24} className="text-primary" /> My Academic Performance Report
            </h3>
            <p className="text-muted small mb-0">
              Verified analytics, subject trends, and weakness diagnosis based on your published examination attempts
            </p>
          </div>
          <button
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-3 shadow-sm"
            onClick={handleDownloadPDF}
            disabled={!report || examHistory.length === 0}
          >
            <Download size={16} /> Download Official PDF
          </button>
        </div>

        {error ? (
          <div className="alert alert-danger">{error}</div>
        ) : examHistory.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted bg-white">
            <BookOpen size={48} className="mx-auto mb-3 text-secondary opacity-50" />
            <h5 className="text-dark">No Published Exam Results Yet</h5>
            <p className="small">
              You will see your comprehensive subject trends, grades, and strengths here as soon as your teachers
              publish your examination results.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <span className="text-muted small fw-semibold text-uppercase">Cumulative Average</span>
                  <h2 className="fw-bold text-primary my-1">{summary?.overallAveragePercentage || 0}%</h2>
                  <small className="text-muted">Across all published examinations</small>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <span className="text-muted small fw-semibold text-uppercase">Exams Attempted</span>
                  <h2 className="fw-bold text-dark my-1">{summary?.totalExamsAttempted || 0}</h2>
                  <small className="text-success fw-semibold">
                    {summary?.passedExamsCount || 0} Passed ({summary?.totalExamsAttempted ? Math.round(((summary?.passedExamsCount || 0) / summary.totalExamsAttempted) * 100) : 0}%)
                  </small>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <span className="text-muted small fw-semibold text-uppercase">Candidate Placed</span>
                  <h2 className="fw-bold text-secondary my-1">{student?.classGrade || 'Class'}</h2>
                  <small className="text-muted font-monospace">Roll #{student?.rollNumber || '-'} • Sec {student?.section || 'A'}</small>
                </div>
              </div>
            </div>

            {/* Performance Trend Chart */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                  <h6 className="fw-bold text-dark mb-3">Score Progression Trend Over Time</h6>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="examTitle" tick={{ fontSize: 11 }} />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        name="Percentage"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject Breakdown Chart */}
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <h6 className="fw-bold text-dark mb-3">Subject-Wise Averages</h6>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={subjectBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="averagePercentage" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4-LEVEL CHAPTER AND TOPIC ANALYSIS DRILL-DOWN */}
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Layers size={20} className="text-primary" /> Chapter & Topic Drill-Down Analysis
                  </h5>
                  <p className="text-muted small mb-0">
                    Drill down across Unit, Topic, Sub-topic, and Child topic levels with scored marks vs total marks.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ width: '200px' }}
                    placeholder="Search topic / path..."
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                  />

                  <div className="btn-group btn-group-sm">
                    {['unit', 'topic', 'subtopic', 'child'].map((lvl) => (
                      <button
                        key={lvl}
                        className={`btn ${drillLevel === lvl ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setDrillLevel(lvl)}
                      >
                        {lvl.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {topicAnalysis?.levelBreakdown?.[drillLevel]?.length > 0 ? (
                <div className="mb-4">
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={topicAnalysis.levelBreakdown[drillLevel]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} unit="%" />
                        <Tooltip formatter={(value) => [`${value}%`, 'Score Percentage']} />
                        <Bar dataKey="percentage" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="table-responsive mt-3">
                    <table className="table table-sm table-bordered align-middle mb-0">
                      <thead className="table-light small">
                        <tr>
                          <th>Path / Name</th>
                          <th>Level</th>
                          <th>Subject</th>
                          <th>Scored / Total</th>
                          <th>Percentage</th>
                          <th>Performance Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topicAnalysis.levelBreakdown[drillLevel].map((item) => (
                          <tr key={item.categoryId}>
                            <td>
                              <div className="fw-semibold small">{item.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {item.fullPath}
                              </div>
                            </td>
                            <td><span className="badge bg-light text-dark border text-uppercase">{item.level}</span></td>
                            <td>{item.subject}</td>
                            <td className="font-monospace small">{item.scoredMarks} / {item.totalMarks}</td>
                            <td className="fw-bold">{item.percentage}%</td>
                            <td>
                              <span className={`badge bg-${item.colorClass}`}>
                                {item.performanceLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted small">
                  No data points recorded for level '{drillLevel.toUpperCase()}'.
                </div>
              )}

              <div className="mt-4 pt-3 border-top">
                <h6 className="fw-bold text-danger mb-2 d-flex align-items-center gap-1">
                  <AlertTriangle size={16} /> Weak Areas Diagnosis (Lowest Scoring First)
                </h6>
                {topicAnalysis?.weakAreas?.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {topicAnalysis.weakAreas.map((w) => (
                      <div
                        key={w.categoryId}
                        className="p-2 rounded bg-danger-subtle border border-danger-subtle d-flex justify-content-between align-items-center small"
                      >
                        <div>
                          <div className="fw-semibold text-danger">{w.name} ({w.percentage}%)</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>Path: {w.fullPath}</div>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-danger text-white">Questions Attempted: {w.attemptsCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted small">No weak areas identified below 40% score. Great job!</div>
                )}
              </div>
            </div>

            {/* Strengths & Weak Topics Diagnosis */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <h6 className="fw-bold text-success d-flex align-items-center gap-2 mb-3">
                    <CheckCircle2 size={18} /> Strengths & Proficient Concepts
                  </h6>
                  {strengths.length === 0 ? (
                    <p className="text-muted small">No distinct high-scoring topics identified yet.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {strengths.map((s, idx) => (
                        <div key={idx} className="p-2 rounded bg-success-subtle text-success d-flex justify-content-between align-items-center small">
                          <span><strong>{s.topic}</strong> ({s.subject})</span>
                          <span className="badge bg-success text-white">{s.accuracy}% Accuracy</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <h6 className="fw-bold text-danger d-flex align-items-center gap-2 mb-3">
                    <AlertTriangle size={18} /> Focus Topics & Areas for Improvement
                  </h6>
                  {weakTopics.length === 0 ? (
                    <p className="text-muted small">Great work! No critical weak areas detected below 50% accuracy.</p>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {weakTopics.map((w, idx) => (
                        <div key={idx} className="p-2 rounded bg-danger-subtle text-danger d-flex justify-content-between align-items-center small">
                          <span><strong>{w.topic}</strong> ({w.subject})</span>
                          <span className="badge bg-danger text-white">{w.accuracy}% Accuracy</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Exam Attempts History Table */}
            <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
              <div className="card-header bg-white border-0 py-3 px-4">
                <h6 className="fw-bold text-dark mb-0">Published Examination Records</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase text-secondary">
                    <tr>
                      <th className="py-3 px-4">Exam Code</th>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Score Obtained</th>
                      <th>Percentage</th>
                      <th>Result</th>
                      <th className="text-end px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examHistory.map((e) => (
                      <tr key={e.attemptId}>
                        <td className="py-3 px-4 font-monospace">{e.examCode}</td>
                        <td className="fw-semibold text-dark">{e.examTitle}</td>
                        <td>
                          <span className="badge bg-light text-dark border">{e.subject}</span>
                        </td>
                        <td className="fw-bold font-monospace">
                          {e.score} <span className="text-muted fw-normal">/ {e.maxMarks}</span>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {e.percentage}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${e.isPassed ? 'bg-success' : 'bg-danger'}`}>
                            {e.isPassed ? 'PASSED' : 'NEEDS IMP'}
                          </span>
                        </td>
                        <td className="text-end px-4">
                          <a href={`/exams/${e.examId}/results`} className="btn btn-sm btn-outline-primary">
                            Review Solutions
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

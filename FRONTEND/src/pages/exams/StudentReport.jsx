import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import reportService from '../../services/reportService.js';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await reportService.getStudentReport('me');
      setReport(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to retrieve performance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownloadPDF = () => {
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
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
      doc.setTextColor(0);

      // Summary Table
      autoTable(doc, {
        startY: 42,
        head: [['Metric', 'Performance Result']],
        body: [
          ['Exams Attempted & Published', report.summary?.totalExamsAttempted || 0],
          ['Cumulative Average Percentage', `${report.summary?.overallAveragePercentage || 0}%`],
          ['Passed Examinations', report.summary?.passedExamsCount || 0],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
      });

      // Exam History Table
      if (report.examHistory?.length > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Exam Code', 'Exam Title', 'Subject', 'Score', 'Percentage', 'Status']],
          body: report.examHistory.map((e) => [
            e.examCode || 'EXM',
            e.examTitle || 'Exam',
            e.subject || '',
            `${e.score} / ${e.maxMarks}`,
            `${e.percentage}%`,
            e.isPassed ? 'PASS' : 'NEEDS IMP',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
        });
      }

      doc.save(`Student_Report_${report.student?.name?.replace(/\s+/g, '_') || 'Academic'}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
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

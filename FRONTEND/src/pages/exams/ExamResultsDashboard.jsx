/**
 * ExamResultsDashboard.jsx
 * 
 * Advanced analytics dashboard for authorised staff (superadmin, principal, admin, teacher).
 * Uses Recharts for visualizations and real exam data from the API.
 * Supports PDF and Excel export.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChart3, Award, Users, TrendingUp, Download, FileSpreadsheet,
  ChevronLeft, RefreshCw, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import API from '../../api/api.js';
import Sidebar from '../../components/Sidebar.jsx';

// ─── Configurable performance thresholds ───────────────────────────────────
const THRESHOLDS = {
  STRONG: 75,   // >= 75% → green
  GOOD: 50,     // >= 50% → blue
  NEEDS_IMP: 33, // >= 33% → amber
  // < 33% → red
};

const GRADE_BANDS = [
  { label: 'A+ (90-100%)', min: 90, max: 100, color: '#10b981' },
  { label: 'A (80-89%)', min: 80, max: 90, color: '#22c55e' },
  { label: 'B (70-79%)', min: 70, max: 80, color: '#3b82f6' },
  { label: 'C (60-69%)', min: 60, max: 70, color: '#6366f1' },
  { label: 'D (50-59%)', min: 50, max: 60, color: '#f59e0b' },
  { label: 'E (33-49%)', min: 33, max: 50, color: '#f97316' },
  { label: 'F (0-32%)', min: 0, max: 33, color: '#ef4444' },
];

const perfColor = (pct) => {
  if (pct >= THRESHOLDS.STRONG) return '#10b981';
  if (pct >= THRESHOLDS.GOOD) return '#3b82f6';
  if (pct >= THRESHOLDS.NEEDS_IMP) return '#f59e0b';
  return '#ef4444';
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card shadow border-0 p-2" style={{ minWidth: 140 }}>
      {label && <div className="fw-semibold mb-1 small">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="d-flex justify-content-between gap-3 small">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="fw-semibold">{p.value}{p.unit || ''}</span>
        </div>
      ))}
    </div>
  );
};

export default function ExamResultsDashboard() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState('');

  // ─── Fetch analytics data ─────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!examId) {
      setError('No exam ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await API.get(`/exams/${examId}/analytics`);
      if (res.data?.success) {
        setAnalytics(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ─── Derived chart data ──────────────────────────────────────────────────
  const gradeBandData = () => {
    if (!analytics?.candidateRankings) return [];
    return GRADE_BANDS.map((band) => {
      const count = analytics.candidateRankings.filter(
        (c) => c.percentage >= band.min && c.percentage < band.max
      ).length;
      return { ...band, count };
    }).filter((b) => b.count > 0);
  };

  const questionAccuracyData = () => {
    if (!analytics?.questionPerformance) return [];
    return analytics.questionPerformance.slice(0, 20).map((q, i) => ({
      name: `Q${i + 1}`,
      accuracy: q.accuracyRate,
      attempted: q.totalAttempted,
      questionText: q.questionText?.substring(0, 60) + (q.questionText?.length > 60 ? '...' : ''),
    }));
  };

  const rankingChartData = () => {
    if (!analytics?.candidateRankings) return [];
    return analytics.candidateRankings.slice(0, 15).map((c) => ({
      name: c.studentName.split(' ')[0],
      score: c.score,
      percentage: c.percentage,
      isPassed: c.isPassed,
    }));
  };

  // ─── PDF Export ──────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!analytics) return;
    setExporting('pdf');
    try {
      const doc = new jsPDF();
      const { exam, summary, candidateRankings } = analytics;

      doc.setFontSize(18);
      doc.text('Examination Analytics Report', 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`${exam?.title || 'Exam'} | ${exam?.subject || ''} | Class ${exam?.classGrade || ''}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
      doc.setTextColor(0);

      // Summary table
      autoTable(doc, {
        startY: 42,
        head: [['Metric', 'Value']],
        body: [
          ['Total Eligible Students', summary?.totalEligible],
          ['Total Appeared', summary?.totalStarted],
          ['Total Submitted', summary?.totalSubmitted],
          ['Absent / Not Appeared', summary?.absentCount],
          ['Passed', summary?.passedCount],
          ['Failed', summary?.failedCount],
          ['Pass Percentage', `${summary?.passPercentage}%`],
          ['Average Score', `${summary?.averageScore} / ${summary?.maxMarks}`],
          ['Highest Score', `${summary?.highestScore} / ${summary?.maxMarks}`],
          ['Lowest Score', `${summary?.lowestScore} / ${summary?.maxMarks}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Rankings table
      if (candidateRankings?.length > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Rank', 'Student', 'Roll No', 'Score', 'Percentage', 'Grade', 'Status']],
          body: candidateRankings.map((c) => [
            c.rank,
            c.studentName,
            c.rollNumber || '-',
            `${c.score} / ${summary?.maxMarks}`,
            `${c.percentage}%`,
            GRADE_BANDS.find((g) => c.percentage >= g.min && c.percentage < g.max)?.label?.split(' ')[0] || '-',
            c.isPassed ? 'PASS' : 'FAIL',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          bodyStyles: { fontSize: 9 },
        });
      }

      doc.save(`${exam?.title || 'exam'}_analytics_report.pdf`);
    } catch (e) {
      alert('PDF export failed: ' + e.message);
    } finally {
      setExporting('');
    }
  };

  // ─── Excel Export ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!analytics) return;
    setExporting('excel');
    try {
      const { exam, summary, candidateRankings, questionPerformance } = analytics;
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Examination Analytics Report'],
        [`Exam: ${exam?.title || ''}`],
        [`Subject: ${exam?.subject || ''}`],
        [`Class: ${exam?.classGrade || ''}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Metric', 'Value'],
        ['Total Eligible', summary?.totalEligible],
        ['Total Appeared', summary?.totalStarted],
        ['Total Submitted', summary?.totalSubmitted],
        ['Absent', summary?.absentCount],
        ['Passed', summary?.passedCount],
        ['Failed', summary?.failedCount],
        ['Pass %', `${summary?.passPercentage}%`],
        ['Average Score', summary?.averageScore],
        ['Highest Score', summary?.highestScore],
        ['Lowest Score', summary?.lowestScore],
        ['Max Marks', summary?.maxMarks],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

      // Rankings sheet
      if (candidateRankings?.length) {
        const rankData = [
          ['Rank', 'Student Name', 'Roll No', 'School ID', 'Score', 'Max Marks', 'Percentage', 'Pass/Fail', 'Submitted At'],
          ...candidateRankings.map((c) => [
            c.rank, c.studentName, c.rollNumber || '', c.schoolId || '',
            c.score, summary?.maxMarks, `${c.percentage}%`,
            c.isPassed ? 'PASS' : 'FAIL',
            c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '',
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rankData), 'Rankings');
      }

      // Question performance sheet
      if (questionPerformance?.length) {
        const qData = [
          ['#', 'Section', 'Question (truncated)', 'Type', 'Marks', 'Total Attempted', 'Correct', 'Accuracy %'],
          ...questionPerformance.map((q, i) => [
            i + 1, q.sectionTitle,
            q.questionText?.substring(0, 80) || '',
            q.questionType, q.marks,
            q.totalAttempted, q.correctCount, `${q.accuracyRate}%`,
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qData), 'Question Analysis');
      }

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbOut], { type: 'application/octet-stream' }), `${exam?.title || 'exam'}_analytics.xlsx`);
    } catch (e) {
      alert('Excel export failed: ' + e.message);
    } finally {
      setExporting('');
    }
  };

  // ─── Loading / Error / Guard ──────────────────────────────────────────────
  if (!['superadmin', 'principal', 'admin', 'teacher'].includes(user.role)) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar user={user} />
        <main className="flex-grow-1 p-4" style={{ marginLeft: 260 }}>
          <div className="alert alert-danger">You are not authorized to view this report.</div>
        </main>
      </div>
    );
  }

  const { exam, summary, candidateRankings = [], questionPerformance = [] } = analytics || {};

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar user={user} />

      <main className="flex-grow-1 p-4" style={{ marginLeft: 260 }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
              <ChevronLeft size={16} />
            </button>
            <div>
              <h4 className="mb-0 fw-bold">Examination Analytics</h4>
              {exam && (
                <p className="text-muted small mb-0">
                  {exam.title} · {exam.subject} · Class {exam.classGrade}
                </p>
              )}
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchAnalytics} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin me-1' : 'me-1'} />
              Refresh
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={exportPDF} disabled={!analytics || exporting === 'pdf'}>
              <Download size={14} className="me-1" />
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
            <button className="btn btn-sm btn-outline-success" onClick={exportExcel} disabled={!analytics || exporting === 'excel'}>
              <FileSpreadsheet size={14} className="me-1" />
              {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted">Loading analytics...</p>
          </div>
        )}

        {analytics && !loading && (
          <>
            {/* ─── Summary Cards ────────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
              {[
                { label: 'Total Eligible', value: summary.totalEligible, icon: <Users size={20} />, color: '#6366f1' },
                { label: 'Appeared', value: summary.totalStarted, icon: <BarChart3 size={20} />, color: '#3b82f6' },
                { label: 'Submitted', value: summary.totalSubmitted, icon: <CheckCircle2 size={20} />, color: '#10b981' },
                { label: 'Pass %', value: `${summary.passPercentage}%`, icon: <Award size={20} />, color: '#f59e0b' },
                { label: 'Avg Score', value: `${summary.averageScore}/${summary.maxMarks}`, icon: <TrendingUp size={20} />, color: '#8b5cf6' },
                { label: 'Highest', value: summary.highestScore, icon: <CheckCircle2 size={20} />, color: '#22c55e' },
                { label: 'Lowest', value: summary.lowestScore, icon: <XCircle size={20} />, color: '#ef4444' },
                { label: 'Absent', value: summary.absentCount, icon: <AlertTriangle size={20} />, color: '#9ca3af' },
              ].map((card) => (
                <div className="col-6 col-md-3" key={card.label}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div
                        className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                        style={{ background: card.color + '20', color: card.color, width: 44, height: 44 }}
                      >
                        {card.icon}
                      </div>
                      <div>
                        <div className="fw-bold fs-5">{card.value}</div>
                        <div className="text-muted small">{card.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Tabs ──────────────────────────────────────────────────────── */}
            <ul className="nav nav-tabs mb-4">
              {[
                { id: 'overview', label: 'Overview Charts' },
                { id: 'rankings', label: `Rankings (${candidateRankings.length})` },
                { id: 'questions', label: `Question Analysis (${questionPerformance.length})` },
              ].map((tab) => (
                <li className="nav-item" key={tab.id}>
                  <button
                    className={`nav-link ${activeTab === tab.id ? 'active fw-semibold' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* ─── Overview Tab ────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="row g-4">
                {/* Grade Distribution Pie */}
                <div className="col-md-5">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white fw-semibold border-0">
                      Grade Distribution
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={gradeBandData()}
                            dataKey="count"
                            nameKey="label"
                            cx="50%" cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                          >
                            {gradeBandData().map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Pass vs Fail Bar */}
                <div className="col-md-7">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white fw-semibold border-0">
                      Pass / Fail Distribution
                    </div>
                    <div className="card-body">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={[
                            { name: 'Results', Passed: summary.passedCount, Failed: summary.failedCount, Absent: summary.absentCount },
                          ]}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="Passed" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Absent" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Top Student Scores Bar */}
                {rankingChartData().length > 0 && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white fw-semibold border-0">
                        Top 15 Student Scores
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={rankingChartData()}
                            margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, summary.maxMarks]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                              {rankingChartData().map((entry, i) => (
                                <Cell key={i} fill={entry.isPassed ? '#3b82f6' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="text-muted small text-center mt-1">
                          <span className="me-2">🔵 Passed</span> <span>🔴 Failed</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Accuracy Line Chart */}
                {questionAccuracyData().length > 0 && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white fw-semibold border-0">
                        Question-wise Accuracy Rate
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart
                            data={questionAccuracyData()}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" />
                            <YAxis unit="%" domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="accuracy"
                              name="Accuracy %"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                              unit="%"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Rankings Tab ─────────────────────────────────────────────── */}
            {activeTab === 'rankings' && (
              <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                  {candidateRankings.length === 0 ? (
                    <div className="text-center py-5 text-muted">No submissions recorded yet.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Rank</th>
                            <th>Student</th>
                            <th>Roll No</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Grade</th>
                            <th>Status</th>
                            <th>Submitted At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidateRankings.map((c) => {
                            const band = GRADE_BANDS.find((g) => c.percentage >= g.min && c.percentage < g.max);
                            return (
                              <tr key={c.attemptId}>
                                <td>
                                  <span className="fw-bold">#{c.rank}</span>
                                </td>
                                <td className="fw-semibold">{c.studentName}</td>
                                <td className="text-muted small">{c.rollNumber || '-'}</td>
                                <td>
                                  <strong>{c.score}</strong>
                                  <span className="text-muted">/{summary.maxMarks}</span>
                                </td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      background: perfColor(c.percentage) + '20',
                                      color: perfColor(c.percentage),
                                      border: `1px solid ${perfColor(c.percentage)}40`,
                                    }}
                                  >
                                    {c.percentage}%
                                  </span>
                                </td>
                                <td>
                                  <span className="fw-semibold small" style={{ color: band?.color }}>
                                    {band?.label?.split(' ')[0] || '-'}
                                  </span>
                                </td>
                                <td>
                                  {c.isPassed ? (
                                    <span className="badge bg-success-subtle text-success border border-success-subtle">PASS</span>
                                  ) : (
                                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle">FAIL</span>
                                  )}
                                </td>
                                <td className="text-muted small">
                                  {c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Question Analysis Tab ─────────────────────────────────────── */}
            {activeTab === 'questions' && (
              <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                  {questionPerformance.length === 0 ? (
                    <div className="text-center py-5 text-muted">No question data available.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Section</th>
                            <th>Question</th>
                            <th>Type</th>
                            <th>Marks</th>
                            <th>Attempted</th>
                            <th>Correct</th>
                            <th>Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questionPerformance.map((q, i) => (
                            <tr key={q.questionId}>
                              <td className="fw-bold">{i + 1}</td>
                              <td className="text-muted small">{q.sectionTitle}</td>
                              <td style={{ maxWidth: 300 }}>
                                <span className="small" title={q.questionText}>
                                  {q.questionText?.substring(0, 80)}{q.questionText?.length > 80 ? '...' : ''}
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border small">
                                  {q.questionType?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td>{q.marks}</td>
                              <td>{q.totalAttempted}</td>
                              <td>{q.correctCount}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="progress flex-grow-1"
                                    style={{ height: 8, minWidth: 60 }}
                                    role="progressbar"
                                    aria-valuenow={q.accuracyRate}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  >
                                    <div
                                      className="progress-bar"
                                      style={{
                                        width: `${q.accuracyRate}%`,
                                        background: perfColor(q.accuracyRate),
                                      }}
                                    />
                                  </div>
                                  <span className="small fw-semibold" style={{ color: perfColor(q.accuracyRate) }}>
                                    {q.accuracyRate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .nav-tabs .nav-link { color: #6b7280; }
        .nav-tabs .nav-link.active { color: #1d4ed8; border-bottom-color: #1d4ed8; }
      `}</style>
    </div>
  );
}

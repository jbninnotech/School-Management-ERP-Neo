import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';
import * as XLSX from 'xlsx';

export default function AttendanceReports() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly'); // 'daily' | 'weekly' | 'monthly' | 'three_months'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState({
    summary: {},
    trendData: [],
    records: [],
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAttendanceReports({
        period,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.data?.success) {
        setReportData({
          summary: res.data.summary || {},
          trendData: res.data.trendData || [],
          records: res.data.records || [],
        });
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!reportData.records || reportData.records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const rows = reportData.records.map((r) => ({
      Date: r.date,
      TeacherName: r.teacher?.name || 'N/A',
      EmployeeID: r.teacher?.teacherProfile?.employeeId || r.teacher?.schoolId || 'N/A',
      Department: r.teacher?.department || 'N/A',
      PunchIn: r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString() : 'N/A',
      PunchOut: r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString() : 'N/A',
      WorkingMinutes: r.effectiveWorkingMinutes || 0,
      WorkingHours: Math.round(((r.effectiveWorkingMinutes || 0) / 60) * 10) / 10,
      LateMinutes: r.lateMinutes || 0,
      Status: r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `Teacher_Attendance_Report_${period}.xlsx`);
  };

  const { summary, trendData } = reportData;

  // Chart Color Palettes
  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];
  const pieData = [
    { name: 'Present Days', value: summary.presentDays || 0 },
    { name: 'Absent Days', value: summary.absentDays || 0 },
    { name: 'Late Days', value: summary.lateDays || 0 },
    { name: 'Half Days', value: summary.halfDays || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <BarChart3 className="text-primary" /> Attendance Analytics & Executive Reports
            </h2>
            <p className="text-muted small mb-0">
              Institutional performance trends, working hour audit logs, and downloadable compliance summaries.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Period Selector Buttons */}
            <div className="btn-group shadow-sm">
              <button
                className={`btn btn-sm ${period === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPeriod('daily')}
              >
                Daily
              </button>
              <button
                className={`btn btn-sm ${period === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPeriod('weekly')}
              >
                1 Week
              </button>
              <button
                className={`btn btn-sm ${period === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPeriod('monthly')}
              >
                1 Month
              </button>
              <button
                className={`btn btn-sm ${period === 'three_months' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPeriod('three_months')}
              >
                3 Months
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm"
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>

            {/* Print Window Button */}
            <button
              onClick={() => window.print()}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics Strip */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
              <span className="text-muted small fw-semibold">Attendance Rate</span>
              <h3 className="fw-bold text-success mt-1 mb-0">{summary.attendancePercentage || 0}%</h3>
              <small className="text-muted">Total working sessions</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
              <span className="text-muted small fw-semibold">Avg. Working Hours</span>
              <h3 className="fw-bold text-primary mt-1 mb-0">{summary.averageWorkingHours || 0} hrs</h3>
              <small className="text-muted">Per active faculty day</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
              <span className="text-muted small fw-semibold">Late Arrivals</span>
              <h3 className="fw-bold text-warning mt-1 mb-0">{summary.lateDays || 0}</h3>
              <small className="text-muted">Total tardy logins recorded</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
              <span className="text-muted small fw-semibold">Total Cumulative Hours</span>
              <h3 className="fw-bold text-dark mt-1 mb-0">{summary.totalWorkingHours || 0} hrs</h3>
              <small className="text-muted">Recorded effective work</small>
            </div>
          </div>
        </div>

        {/* Visual Analytics Charts Section */}
        <div className="row g-4 mb-4">
          
          {/* Chart 1: Attendance Daily Trend Line Chart */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Daily Attendance Trend & Late Logins
              </h6>
              <div style={{ width: '100%', height: 300 }}>
                {trendData.length === 0 ? (
                  <div className="h-100 d-flex align-items-center justify-center text-muted">
                    No trend metrics recorded for this selected range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="present" name="Present Teachers" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="late" name="Late Logins" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Chart 2: Attendance Distribution Pie Chart */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <h6 className="fw-bold text-dark mb-3">Attendance Breakdown</h6>
              <div style={{ width: '100%', height: 300 }}>
                {pieData.length === 0 ? (
                  <div className="h-100 d-flex align-items-center justify-center text-muted">
                    No data to display.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Chart 3: Working Hours Analysis Bar Chart */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3">Institutional Daily Hours Logged (Aggregate)</h6>
              <div style={{ width: '100%', height: 260 }}>
                {trendData.length === 0 ? (
                  <div className="h-100 d-flex align-items-center justify-center text-muted">
                    No hours recorded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="totalHours" name="Total Working Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabular Records */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-header bg-white border-bottom p-3">
            <h6 className="fw-bold text-dark mb-0">Tabular Attendance Records ({reportData.records?.length || 0})</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light text-muted text-uppercase">
                <tr>
                  <th className="ps-4">Date</th>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Working Hours</th>
                  <th>Late (Mins)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.records?.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No matching records for this period.
                    </td>
                  </tr>
                ) : (
                  reportData.records.map((r) => (
                    <tr key={r._id}>
                      <td className="ps-4 fw-bold font-monospace">{r.date}</td>
                      <td>
                        <div className="fw-semibold text-dark">{r.teacher?.name || 'Faculty Member'}</div>
                        <span className="text-muted font-monospace">{r.teacher?.teacherProfile?.employeeId || r.teacher?.schoolId}</span>
                      </td>
                      <td>{r.teacher?.department || 'Academics'}</td>
                      <td className="font-monospace">
                        {r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="font-monospace">
                        {r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="fw-bold text-dark">
                        {Math.floor((r.effectiveWorkingMinutes || 0) / 60)}h {(r.effectiveWorkingMinutes || 0) % 60}m
                      </td>
                      <td>
                        {r.lateMinutes > 0 ? (
                          <span className="badge bg-danger-subtle text-danger">+{r.lateMinutes}m</span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  FileText,
  Settings,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Download,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';
import { getSocket } from '../../api/socket.js';

export default function AdminAttendanceDashboard() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalTeachers: 0,
      presentToday: 0,
      absentToday: 0,
      currentlyWorking: 0,
      lateLoginToday: 0,
      halfDayAttendance: 0,
      fullDayAttendance: 0,
      onLeave: 0,
      weeklyOff: 0,
      overtimeTeachers: 0,
    },
    teachers: [],
  });

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Fetch Dashboard Analytics & Teachers
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminDashboard({ date: selectedDate });
      if (res.data?.success) {
        setDashboardData({
          stats: res.data.stats || {},
          teachers: res.data.teachers || [],
        });
      }
    } catch (err) {
      console.error('Failed to load attendance dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);

  // Real-time Socket.IO Listeners for instant punch updates
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleLiveUpdate = (payload) => {
        // Auto refresh table when a teacher punches in/out
        fetchDashboard();
      };
      socket.on('attendance_live_update', handleLiveUpdate);
      return () => socket.off('attendance_live_update', handleLiveUpdate);
    }
  }, [selectedDate]);

  // Filtered teachers list
  const filteredTeachers = (dashboardData.teachers || []).filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.employeeId && t.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchDept = departmentFilter === 'ALL' || t.department === departmentFilter;
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  // Extract distinct departments for filter dropdown
  const departments = Array.from(
    new Set((dashboardData.teachers || []).map((t) => t.department).filter(Boolean))
  );

  // Status badge helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Working':
      case 'Present':
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Working</span>;
      case 'Completed':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">Completed</span>;
      case 'Late':
      case 'Very Late':
        return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">Late</span>;
      case 'Half Day':
        return <span className="badge bg-purple-subtle text-purple border px-2 py-1" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>Half Day</span>;
      case 'On Leave':
        return <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">On Leave</span>;
      case 'Weekly Off':
        return <span className="badge bg-secondary-subtle text-secondary px-2 py-1">Weekly Off</span>;
      case 'Absent':
      default:
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">Absent</span>;
    }
  };

  const { stats } = dashboardData;

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Header with Navigation and Quick Actions */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <Users className="text-primary" /> Teacher Attendance Live Monitor
            </h2>
            <p className="text-muted small mb-0">
              Institutional faculty attendance dashboard, real-time geofence validation, and audit controls.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              type="date"
              className="form-control form-control-sm shadow-sm"
              style={{ width: 'auto' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              onClick={fetchDashboard}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link to="/attendance/reports" className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm">
              <TrendingUp size={14} /> Analytics & Reports
            </Link>
          </div>
        </div>

        {/* 10 Live KPI Metric Cards */}
        <div className="row g-2 g-md-3 mb-4">
          <div className="col-6 col-sm-4 col-lg-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100">
              <span className="text-muted small fw-semibold">Total Faculty</span>
              <h3 className="fw-bold text-dark mt-1 mb-0">{stats.totalTeachers}</h3>
            </div>
          </div>
          <div className="col-6 col-sm-4 col-lg-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-success border-3">
              <span className="text-success small fw-semibold">Present Today</span>
              <h3 className="fw-bold text-success mt-1 mb-0">{stats.presentToday}</h3>
            </div>
          </div>
          <div className="col-6 col-sm-4 col-lg-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-danger border-3">
              <span className="text-danger small fw-semibold">Absent Today</span>
              <h3 className="fw-bold text-danger mt-1 mb-0">{stats.absentToday}</h3>
            </div>
          </div>
          <div className="col-6 col-sm-4 col-lg-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-primary border-3">
              <span className="text-primary small fw-semibold">Currently Working</span>
              <h3 className="fw-bold text-primary mt-1 mb-0">{stats.currentlyWorking}</h3>
            </div>
          </div>
          <div className="col-6 col-sm-4 col-lg-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-warning border-3">
              <span className="text-warning small fw-semibold">Late Login</span>
              <h3 className="fw-bold text-warning mt-1 mb-0">{stats.lateLoginToday}</h3>
            </div>
          </div>
          <div className="col-6 col-sm-4 col-lg-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-info border-3">
              <span className="text-info small fw-semibold">On Leave</span>
              <h3 className="fw-bold text-info mt-1 mb-0">{stats.onLeave}</h3>
            </div>
          </div>
        </div>

        {/* Secondary metric bar: Half Day, Full Day, Overtime, Weekly Off */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <span className="badge bg-white text-secondary border px-3 py-2 rounded-pill shadow-sm">
            Half-Day: <strong>{stats.halfDayAttendance}</strong>
          </span>
          <span className="badge bg-white text-secondary border px-3 py-2 rounded-pill shadow-sm">
            Full-Day Completed: <strong>{stats.fullDayAttendance}</strong>
          </span>
          <span className="badge bg-white text-secondary border px-3 py-2 rounded-pill shadow-sm">
            Overtime: <strong>{stats.overtimeTeachers}</strong>
          </span>
          <span className="badge bg-white text-secondary border px-3 py-2 rounded-pill shadow-sm">
            Weekly Off: <strong>{stats.weeklyOff}</strong>
          </span>
        </div>

        {/* Live Teacher Monitoring Table Card */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-header bg-white border-bottom p-3 p-md-4">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={16} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0 bg-light"
                    placeholder="Search faculty name, ID, or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-6 col-md-3">
                <select
                  className="form-select bg-light"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <select
                  className="form-select bg-light"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Working">Working Now</option>
                  <option value="Completed">Completed</option>
                  <option value="Late">Late Login</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div className="col-12 col-md-2 text-md-end text-muted small">
                Showing <strong>{filteredTeachers.length}</strong> teachers
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Teacher Name & ID</th>
                  <th>Department / Subject</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Working Hours</th>
                  <th>Remaining</th>
                  <th>Late (Mins)</th>
                  <th>Location Status</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="small">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      No teacher attendance records found for this date.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t) => (
                    <tr key={t._id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={t.profilePhoto || 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png'}
                            alt=""
                            className="rounded-circle border"
                            style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                          />
                          <div>
                            <div className="fw-bold text-dark">{t.name}</div>
                            <span className="text-muted font-monospace small">{t.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-dark fw-semibold">{t.department}</div>
                        <span className="text-muted small">
                          {Array.isArray(t.assignedSubjects) ? t.assignedSubjects.join(', ') : t.department}
                        </span>
                      </td>
                      <td className="font-monospace">
                        {t.punchInTime
                          ? new Date(t.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="font-monospace">
                        {t.punchOutTime
                          ? new Date(t.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : t.punchInTime ? (
                            <span className="text-primary fw-semibold">In Progress</span>
                          ) : (
                            '-'
                          )}
                      </td>
                      <td>
                        <span className="fw-bold text-dark">
                          {Math.floor(t.effectiveWorkingMinutes / 60)}h {t.effectiveWorkingMinutes % 60}m
                        </span>
                      </td>
                      <td>
                        <span className="text-muted">
                          {Math.floor(t.remainingMinutes / 60)}h {t.remainingMinutes % 60}m
                        </span>
                      </td>
                      <td>
                        {t.lateMinutes > 0 ? (
                          <span className="badge bg-danger-subtle text-danger fw-bold">
                            +{t.lateMinutes}m
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className="d-flex align-items-center gap-1 small text-muted">
                          <MapPin size={13} className={t.locationStatus === 'Location Verified' ? 'text-success' : 'text-secondary'} />
                          {t.locationStatus}
                        </span>
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
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

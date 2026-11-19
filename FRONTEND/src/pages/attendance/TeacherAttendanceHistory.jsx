import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Coffee,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';

export default function TeacherAttendanceHistory() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'corrections'

  // Date range filters
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getMyHistory(dateFilter);
      if (res.data?.success) {
        setHistory(res.data.history || []);
        setCorrections(res.data.corrections || []);
      }
    } catch (err) {
      console.error('Failed to load attendance history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1300px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <Calendar className="text-primary" /> My Attendance History
            </h2>
            <p className="text-muted small mb-0">
              Audit log of all your historical punches, breaks, late arrivals, and correction requests.
            </p>
          </div>

          {/* Quick tab switcher */}
          <div className="btn-group shadow-sm">
            <button
              className={`btn btn-sm ${activeTab === 'records' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('records')}
            >
              Attendance Records ({history.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'corrections' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('corrections')}
            >
              Correction Requests ({corrections.length})
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-3">
            <form onSubmit={handleFilterSubmit} className="row g-2 align-items-center">
              <div className="col-12 col-sm-4">
                <label className="form-label small text-muted mb-1">Start Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                />
              </div>
              <div className="col-12 col-sm-4">
                <label className="form-label small text-muted mb-1">End Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                />
              </div>
              <div className="col-12 col-sm-4 d-flex align-items-end gap-2 mt-sm-4">
                <button type="submit" className="btn btn-sm btn-primary w-100 fw-bold">
                  Apply Filter
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setDateFilter({ startDate: '', endDate: '' });
                    setTimeout(fetchHistory, 50);
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tab 1: Records Table */}
        {activeTab === 'records' && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4">Date</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Effective Hours</th>
                    <th>Breaks</th>
                    <th>Late (Mins)</th>
                    <th>Overtime</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        No attendance history found.
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h._id}>
                        <td className="ps-4 fw-bold font-monospace text-dark">{h.date}</td>
                        <td className="font-monospace">
                          {h.punchInTime
                            ? new Date(h.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="font-monospace">
                          {h.punchOutTime
                            ? new Date(h.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="fw-semibold text-dark">
                          {Math.floor(h.effectiveWorkingMinutes / 60)}h {h.effectiveWorkingMinutes % 60}m
                        </td>
                        <td>{h.totalBreakMinutes || 0} mins</td>
                        <td>
                          {h.lateMinutes > 0 ? (
                            <span className="badge bg-danger-subtle text-danger">+{h.lateMinutes}m</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {h.overtimeMinutes > 0 ? (
                            <span className="badge bg-success-subtle text-success">
                              +{Math.floor(h.overtimeMinutes / 60)}h {h.overtimeMinutes % 60}m
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            h.status === 'Completed' || h.status === 'Working'
                              ? 'bg-success-subtle text-success'
                              : h.status === 'Late'
                              ? 'bg-warning-subtle text-warning'
                              : 'bg-secondary-subtle text-secondary'
                          } px-2 py-1`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Corrections Table */}
        {activeTab === 'corrections' && (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4">Target Date</th>
                    <th>Requested Punch In</th>
                    <th>Requested Punch Out</th>
                    <th>Reason</th>
                    <th>Admin Review</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {corrections.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No correction requests submitted.
                      </td>
                    </tr>
                  ) : (
                    corrections.map((c) => (
                      <tr key={c._id}>
                        <td className="ps-4 fw-bold font-monospace text-dark">{c.date}</td>
                        <td className="font-monospace">
                          {new Date(c.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="font-monospace">
                          {c.requestedPunchOut
                            ? new Date(c.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="text-muted">{c.reason}</td>
                        <td className="text-muted">{c.adminComment || '-'}</td>
                        <td>
                          <span className={`badge ${
                            c.status === 'Approved'
                              ? 'bg-success-subtle text-success'
                              : c.status === 'Rejected'
                              ? 'bg-danger-subtle text-danger'
                              : 'bg-warning-subtle text-warning'
                          } px-2 py-1`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

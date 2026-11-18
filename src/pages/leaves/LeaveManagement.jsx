import React, { useState, useEffect } from 'react';
import API from '../../api/api.js';
import Sidebar from '../../components/Sidebar.jsx';
import { 
  Calendar, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertCircle,
  PlusCircle,
  Users
} from 'lucide-react';

export default function LeaveManagement() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('apply'); // 'apply', 'my-leaves', 'admin-leaves', 'substitutions'
  const [myLeaves, setMyLeaves] = useState([]);
  const [adminLeaves, setAdminLeaves] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [stats, setStats] = useState({ totalLeaves: 0, pendingLeaves: 0, approvedLeaves: 0, rejectedLeaves: 0 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form State
  const [formData, setFormData] = useState({
    leaveType: 'Casual',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  // Modal / Action remark state
  const [actionModal, setActionModal] = useState({
    show: false,
    leaveId: null,
    action: '', // 'approve' | 'reject'
    remark: '',
    targetType: 'admin', // 'admin' | 'teacher'
  });

  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    setUser(storedUser);
    loadData(storedUser);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const loadData = async (currentUser) => {
    setLoading(true);
    try {
      const u = currentUser || user;
      // Fetch user's leaves
      const myRes = await API.get('/leaves/my');
      if (myRes.data?.data) {
        setMyLeaves(myRes.data.data);
      }

      // If admin, fetch admin list and stats
      if (['superadmin', 'principal', 'admin'].includes(u?.role)) {
        const adminRes = await API.get('/leaves/admin');
        if (adminRes.data?.data) {
          setAdminLeaves(adminRes.data.data);
        }
        const statsRes = await API.get('/leaves/stats');
        if (statsRes.data?.data) {
          setStats(statsRes.data.data);
        }
      }

      // If teacher, fetch substitution requests
      if (u?.role === 'teacher') {
        const subRes = await API.get('/substitutions/my-requests');
        if (subRes.data?.data) {
          setSubstitutions(subRes.data.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!formData.fromDate || !formData.toDate || !formData.reason) {
      showToast('Please fill all required fields', 'danger');
      return;
    }

    try {
      setActionLoading(true);
      await API.post('/leaves', formData);
      showToast('Leave request submitted successfully!', 'success');
      setFormData({
        leaveType: 'Casual',
        fromDate: '',
        toDate: '',
        reason: '',
      });
      setActiveTab('my-leaves');
      loadData(user);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit leave', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      setActionLoading(true);
      await API.patch(`/leaves/${leaveId}/cancel`);
      showToast('Leave cancelled successfully', 'info');
      loadData(user);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Error cancelling leave', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionSubmit = async () => {
    const { leaveId, action, remark, targetType } = actionModal;
    try {
      setActionLoading(true);
      const endpoint = targetType === 'admin'
        ? `/leaves/${leaveId}/admin-action`
        : `/leaves/${leaveId}/teacher-action`;

      await API.patch(endpoint, { action, remark });
      showToast(`Leave application ${action}d successfully`, 'success');
      setActionModal({ show: false, leaveId: null, action: '', remark: '', targetType: 'admin' });
      loadData(user);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Action failed', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubstitutionRespond = async (subId, response) => {
    try {
      setActionLoading(true);
      await API.patch(`/substitutions/${subId}/respond`, { response });
      showToast(`Substitution ${response}ed successfully`, 'success');
      loadData(user);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to respond', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Admin_Approved':
        return <span className="badge bg-success-subtle text-success border border-success px-2 py-1">Approved</span>;
      case 'Teacher_Approved':
        return <span className="badge bg-info-subtle text-info border border-info px-2 py-1">Teacher Approved</span>;
      case 'Admin_Rejected':
      case 'Teacher_Rejected':
        return <span className="badge bg-danger-subtle text-danger border border-danger px-2 py-1">Rejected</span>;
      case 'Cancelled':
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary px-2 py-1">Cancelled</span>;
      default:
        return <span className="badge bg-warning-subtle text-warning border border-warning px-2 py-1">Pending</span>;
    }
  };

  const isAdmin = ['superadmin', 'principal', 'admin'].includes(user?.role);
  const isTeacher = user?.role === 'teacher';

  return (
    <div className="d-flex" style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <Sidebar user={user} />

      <div className="flex-grow-1" style={{ marginLeft: '260px', padding: '28px', maxWidth: 'calc(100vw - 260px)' }}>
        {/* Toast Alert */}
        {toast.show && (
          <div 
            className={`alert alert-${toast.type} alert-dismissible fade show position-fixed top-0 end-0 m-4 shadow`}
            style={{ zIndex: 9999, minWidth: '300px' }}
          >
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
          <div>
            <h3 className="fw-bold text-white mb-1">Leave Management</h3>
            <p className="text-secondary small mb-0">Apply, manage and review leave applications with substitute allocation</p>
          </div>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => loadData(user)}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {/* Admin Stat Cards */}
        {isAdmin && (
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card bg-dark border-secondary border-opacity-25 p-3 rounded-3 shadow-sm">
                <div className="text-secondary small fw-medium">Total Applications</div>
                <div className="h3 fw-bold text-white mt-1 mb-0">{stats.totalLeaves}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-dark border-secondary border-opacity-25 p-3 rounded-3 shadow-sm">
                <div className="text-warning small fw-medium">Pending Review</div>
                <div className="h3 fw-bold text-warning mt-1 mb-0">{stats.pendingLeaves}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-dark border-secondary border-opacity-25 p-3 rounded-3 shadow-sm">
                <div className="text-success small fw-medium">Approved</div>
                <div className="h3 fw-bold text-success mt-1 mb-0">{stats.approvedLeaves}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-dark border-secondary border-opacity-25 p-3 rounded-3 shadow-sm">
                <div className="text-danger small fw-medium">Rejected</div>
                <div className="h3 fw-bold text-danger mt-1 mb-0">{stats.rejectedLeaves}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="d-flex gap-2 border-bottom border-secondary border-opacity-25 mb-4">
          <button
            className={`btn btn-sm pb-2 fw-medium ${activeTab === 'apply' ? 'btn-primary text-white' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('apply')}
          >
            <PlusCircle size={15} className="me-1" /> Apply Leave
          </button>
          <button
            className={`btn btn-sm pb-2 fw-medium ${activeTab === 'my-leaves' ? 'btn-primary text-white' : 'btn-link text-secondary text-decoration-none'}`}
            onClick={() => setActiveTab('my-leaves')}
          >
            <FileText size={15} className="me-1" /> My Leaves ({myLeaves.length})
          </button>
          {isTeacher && (
            <button
              className={`btn btn-sm pb-2 fw-medium ${activeTab === 'substitutions' ? 'btn-primary text-white' : 'btn-link text-secondary text-decoration-none'}`}
              onClick={() => setActiveTab('substitutions')}
            >
              <Users size={15} className="me-1" /> Substitution Requests ({substitutions.length})
            </button>
          )}
          {isAdmin && (
            <button
              className={`btn btn-sm pb-2 fw-medium ${activeTab === 'admin-leaves' ? 'btn-primary text-white' : 'btn-link text-secondary text-decoration-none'}`}
              onClick={() => setActiveTab('admin-leaves')}
            >
              <CheckCircle size={15} className="me-1" /> All Applications ({adminLeaves.length})
            </button>
          )}
        </div>

        {/* Tab 1: Apply Leave */}
        {activeTab === 'apply' && (
          <div className="card bg-dark border-secondary border-opacity-25 p-4 rounded-3 shadow-sm" style={{ maxWidth: '700px' }}>
            <h5 className="text-white fw-bold mb-3 d-flex align-items-center">
              <Send size={18} className="me-2 text-primary" /> Apply for Leave
            </h5>

            <form onSubmit={handleApply}>
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label text-secondary small">Leave Type</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  >
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick / Medical Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-secondary small">From Date *</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-secondary small">To Date *</label>
                  <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label text-secondary small">Reason for Leave *</label>
                  <textarea
                    rows={4}
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Provide detailed explanation for the leave request..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-12 pt-2">
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-medium"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: My Leaves */}
        {activeTab === 'my-leaves' && (
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-dark table-hover mb-0 align-middle">
                <thead>
                  <tr className="border-secondary border-opacity-25 text-secondary small">
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Substitution</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-secondary">
                        No leave records found. Click "Apply Leave" to submit a request.
                      </td>
                    </tr>
                  ) : (
                    myLeaves.map((l) => (
                      <tr key={l._id} className="border-secondary border-opacity-25">
                        <td className="fw-medium text-white">{l.leaveType}</td>
                        <td>{l.fromDate} to {l.toDate}</td>
                        <td>{l.totalDays} day(s)</td>
                        <td style={{ maxWidth: '250px' }} className="text-truncate" title={l.reason}>
                          {l.reason}
                        </td>
                        <td>{getStatusBadge(l.status)}</td>
                        <td>
                          {l.applicantRole === 'teacher' ? (
                            <span className="badge bg-secondary-subtle text-secondary small">
                              {l.substitutionStatus} ({l.impactedPeriodsCount} slots)
                            </span>
                          ) : (
                            <span className="text-secondary small">N/A</span>
                          )}
                        </td>
                        <td className="text-end">
                          {l.status === 'Pending' && (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleCancelLeave(l._id)}
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Teacher's Substitution Requests */}
        {activeTab === 'substitutions' && isTeacher && (
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-dark table-hover mb-0 align-middle">
                <thead>
                  <tr className="border-secondary border-opacity-25 text-secondary small">
                    <th>Date</th>
                    <th>Period</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Original Faculty</th>
                    <th>Status</th>
                    <th className="text-end">Respond</th>
                  </tr>
                </thead>
                <tbody>
                  {substitutions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-secondary">
                        No pending substitution requests assigned to you.
                      </td>
                    </tr>
                  ) : (
                    substitutions.map((s) => (
                      <tr key={s._id} className="border-secondary border-opacity-25">
                        <td className="fw-medium text-white">{s.date}</td>
                        <td>Period {s.periodNo} ({s.startTime} - {s.endTime})</td>
                        <td>{s.classGrade} - {s.section}</td>
                        <td>{s.subject}</td>
                        <td>{s.originalTeacher?.name || 'Faculty Member'}</td>
                        <td>
                          <span className={`badge ${s.status === 'Accepted' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="text-end">
                          {s.status === 'Assigned' && (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-success"
                                onClick={() => handleSubstitutionRespond(s._id, 'accept')}
                                disabled={actionLoading}
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleSubstitutionRespond(s._id, 'reject')}
                                disabled={actionLoading}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Admin Leave Approvals */}
        {activeTab === 'admin-leaves' && isAdmin && (
          <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-dark table-hover mb-0 align-middle">
                <thead>
                  <tr className="border-secondary border-opacity-25 text-secondary small">
                    <th>Applicant</th>
                    <th>Role</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-end">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-secondary">
                        No leave records to display.
                      </td>
                    </tr>
                  ) : (
                    adminLeaves.map((l) => (
                      <tr key={l._id} className="border-secondary border-opacity-25">
                        <td className="fw-medium text-white">
                          {l.applicant?.name}
                          <div className="small text-secondary">{l.applicant?.schoolId}</div>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary text-capitalize">
                            {l.applicantRole}
                          </span>
                        </td>
                        <td>{l.leaveType}</td>
                        <td>{l.fromDate} to {l.toDate} ({l.totalDays}d)</td>
                        <td style={{ maxWidth: '250px' }} className="text-truncate" title={l.reason}>
                          {l.reason}
                        </td>
                        <td>{getStatusBadge(l.status)}</td>
                        <td className="text-end">
                          {['Pending', 'Teacher_Approved'].includes(l.status) ? (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-success"
                                onClick={() => setActionModal({ show: true, leaveId: l._id, action: 'approve', remark: '', targetType: 'admin' })}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => setActionModal({ show: true, leaveId: l._id, action: 'reject', remark: '', targetType: 'admin' })}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-secondary small">Decided</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Remark Modal */}
        {actionModal.show && (
          <div 
            className="modal show d-block" 
            tabIndex="-1" 
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content bg-dark border-secondary text-white">
                <div className="modal-header border-secondary border-opacity-25">
                  <h5 className="modal-title text-capitalize">
                    {actionModal.action} Leave Application
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setActionModal({ show: false, leaveId: null, action: '', remark: '', targetType: 'admin' })}
                  />
                </div>
                <div className="modal-body">
                  <label className="form-label text-secondary small">Remark / Notes (Optional)</label>
                  <textarea
                    rows={3}
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Enter approval or rejection remarks..."
                    value={actionModal.remark}
                    onChange={(e) => setActionModal({ ...actionModal, remark: e.target.value })}
                  />
                </div>
                <div className="modal-footer border-secondary border-opacity-25">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActionModal({ show: false, leaveId: null, action: '', remark: '', targetType: 'admin' })}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`btn btn-${actionModal.action === 'approve' ? 'success' : 'danger'} btn-sm`}
                    onClick={handleActionSubmit}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : `Confirm ${actionModal.action}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

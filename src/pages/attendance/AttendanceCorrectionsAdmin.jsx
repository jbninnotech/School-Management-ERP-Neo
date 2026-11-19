import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  UserCheck
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';

export default function AttendanceCorrectionsAdmin() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [corrections, setCorrections] = useState([]);
  const [reviewModal, setReviewModal] = useState({ open: false, item: null, status: 'Approved', comment: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getCorrections();
      if (res.data?.success) {
        setCorrections(res.data.corrections || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, []);

  const handleReviewAction = async (e) => {
    e.preventDefault();
    try {
      const res = await attendanceService.reviewCorrection(reviewModal.item._id, {
        status: reviewModal.status,
        adminComment: reviewModal.comment,
      });
      if (res.data?.success) {
        setMessage({ type: 'success', text: `Correction request ${reviewModal.status.toLowerCase()}!` });
        setReviewModal({ open: false, item: null, status: 'Approved', comment: '' });
        fetchCorrections();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Review action failed' });
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1300px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <FileCheck2 className="text-primary" /> Attendance Correction & Regularisation Approvals
            </h2>
            <p className="text-muted small mb-0">
              Audit and approve teacher punch adjustments, missed punches, and on-duty exemptions.
            </p>
          </div>
        </div>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        {/* Requests Table */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Teacher</th>
                  <th>Target Date</th>
                  <th>Requested In</th>
                  <th>Requested Out</th>
                  <th>Justification / Reason</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {corrections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No pending correction requests found.
                    </td>
                  </tr>
                ) : (
                  corrections.map((c) => (
                    <tr key={c._id}>
                      <td className="ps-4">
                        <div className="fw-bold text-dark">{c.teacher?.name || 'Faculty Member'}</div>
                        <span className="text-muted font-monospace">{c.teacher?.teacherProfile?.employeeId || c.teacher?.email}</span>
                      </td>
                      <td className="fw-bold font-monospace text-dark">{c.date}</td>
                      <td className="font-monospace">
                        {new Date(c.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="font-monospace">
                        {c.requestedPunchOut
                          ? new Date(c.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="text-muted">{c.reason}</td>
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
                      <td className="text-end pe-4">
                        {c.status === 'Pending' ? (
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              onClick={() => setReviewModal({ open: true, item: c, status: 'Approved', comment: '' })}
                              className="btn btn-sm btn-success px-2 py-1 d-flex align-items-center gap-1"
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => setReviewModal({ open: true, item: c, status: 'Rejected', comment: '' })}
                              className="btn btn-sm btn-outline-danger px-2 py-1 d-flex align-items-center gap-1"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted small">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Confirmation Modal */}
        {reviewModal.open && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {reviewModal.status === 'Approved' ? 'Approve Correction Request' : 'Reject Correction Request'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setReviewModal({ open: false, item: null, status: 'Approved', comment: '' })}></button>
                </div>
                <form onSubmit={handleReviewAction}>
                  <div className="modal-body p-4">
                    <p className="text-muted small mb-3">
                      Reviewing request from <strong>{reviewModal.item?.teacher?.name}</strong> for date <strong>{reviewModal.item?.date}</strong>.
                    </p>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Review Comment / Audit Note</label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Add reason for approval or rejection..."
                        value={reviewModal.comment}
                        onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setReviewModal({ open: false, item: null, status: 'Approved', comment: '' })}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`btn ${reviewModal.status === 'Approved' ? 'btn-success' : 'btn-danger'} fw-bold`}
                    >
                      Confirm {reviewModal.status}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';

export default function AttendanceCalendarManagement() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Public Holiday',
    description: '',
    academicYear: '2026-2027',
  });

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getHolidays();
      if (res.data?.success) {
        setHolidays(res.data.holidays || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await attendanceService.createHoliday(form);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Calendar event added successfully' });
        setShowModal(false);
        fetchHolidays();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add event' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday/working day exception?')) return;
    try {
      await attendanceService.deleteHoliday(id);
      setMessage({ type: 'success', text: 'Event removed' });
      fetchHolidays();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Delete failed' });
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <CalendarCheck className="text-primary" /> Institutional Calendar & Holiday Management
            </h2>
            <p className="text-muted small mb-0">
              Configure school holidays, public observances, and special working days.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary d-flex align-items-center gap-1 shadow-sm fw-bold"
          >
            <Plus size={16} /> Add Calendar Event
          </button>
        </div>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        {/* Holidays List Table */}
        <div className="card border-0 shadow-sm rounded-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Date</th>
                  <th>Event Title</th>
                  <th>Classification</th>
                  <th>Academic Year</th>
                  <th>Notes</th>
                  <th className="text-end pe-4">Action</th>
                </tr>
              </thead>
              <tbody className="small">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      No holidays or calendar exceptions configured.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h._id}>
                      <td className="ps-4 fw-bold font-monospace text-dark">{h.date}</td>
                      <td className="fw-semibold text-dark">{h.title}</td>
                      <td>
                        <span className={`badge ${
                          h.type === 'Public Holiday'
                            ? 'bg-danger-subtle text-danger'
                            : h.type === 'School Holiday'
                            ? 'bg-warning-subtle text-warning'
                            : 'bg-primary-subtle text-primary'
                        } px-2 py-1`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="font-monospace text-muted">{h.academicYear}</td>
                      <td className="text-muted">{h.description || '-'}</td>
                      <td className="text-end pe-4">
                        <button
                          onClick={() => handleDelete(h._id)}
                          className="btn btn-sm btn-outline-danger p-1.5 rounded-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Add Calendar Event / Holiday</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Event Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Independence Day, Annual Sports Day"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Event Type</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value="Public Holiday">Public Holiday</option>
                        <option value="School Holiday">School Holiday</option>
                        <option value="Special Working Day">Special Working Day (Compensatory)</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Description / Purpose</label>
                      <textarea
                        rows="2"
                        className="form-control"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary fw-bold">
                      Add Event
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

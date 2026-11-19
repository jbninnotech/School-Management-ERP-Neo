import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  ShieldCheck
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';

export default function AttendanceScheduleManagement() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 10,
    lateThresholdMinutes: 30,
    halfDayThresholdMinutes: 240,
    fullDayThresholdMinutes: 420,
    requiredWorkingMinutes: 480,
    breakDurationMinutes: 30,
    applicableTo: 'all',
    targetDepartment: '',
    requireLocationVerification: true,
    isDefault: false,
  });

  const allWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getSchedules();
      if (res.data?.success) {
        setSchedules(res.data.schedules || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleToggleDay = (day) => {
    if (form.workingDays.includes(day)) {
      setForm({ ...form, workingDays: form.workingDays.filter((d) => d !== day) });
    } else {
      setForm({ ...form, workingDays: [...form.workingDays, day] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await attendanceService.updateSchedule(editingId, form);
        setMessage({ type: 'success', text: 'Schedule updated successfully' });
      } else {
        await attendanceService.createSchedule(form);
        setMessage({ type: 'success', text: 'New attendance schedule created' });
      }
      setShowModal(false);
      setEditingId(null);
      fetchSchedules();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed' });
    }
  };

  const handleEdit = (sch) => {
    setEditingId(sch._id);
    setForm({
      name: sch.name,
      startTime: sch.startTime,
      endTime: sch.endTime,
      workingDays: sch.workingDays || [],
      gracePeriodMinutes: sch.gracePeriodMinutes || 10,
      lateThresholdMinutes: sch.lateThresholdMinutes || 30,
      halfDayThresholdMinutes: sch.halfDayThresholdMinutes || 240,
      fullDayThresholdMinutes: sch.fullDayThresholdMinutes || 420,
      requiredWorkingMinutes: sch.requiredWorkingMinutes || 480,
      breakDurationMinutes: sch.breakDurationMinutes || 30,
      applicableTo: sch.applicableTo || 'all',
      targetDepartment: sch.targetDepartment || '',
      requireLocationVerification: sch.requireLocationVerification !== false,
      isDefault: sch.isDefault || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await attendanceService.deleteSchedule(id);
      setMessage({ type: 'success', text: 'Schedule deleted' });
      fetchSchedules();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Delete failed' });
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1300px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <Clock className="text-primary" /> Attendance Shift & Schedule Management
            </h2>
            <p className="text-muted small mb-0">
              Configure institutional shifts, working days, late grace periods, and half-day thresholds.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setForm({
                name: '',
                startTime: '09:00',
                endTime: '17:00',
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                gracePeriodMinutes: 10,
                lateThresholdMinutes: 30,
                halfDayThresholdMinutes: 240,
                fullDayThresholdMinutes: 420,
                requiredWorkingMinutes: 480,
                breakDurationMinutes: 30,
                applicableTo: 'all',
                targetDepartment: '',
                requireLocationVerification: true,
                isDefault: false,
              });
              setShowModal(true);
            }}
            className="btn btn-primary d-flex align-items-center gap-1 shadow-sm fw-bold"
          >
            <Plus size={16} /> Create New Shift
          </button>
        </div>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        {/* Schedule Cards Grid */}
        <div className="row g-3">
          {schedules.map((sch) => (
            <div key={sch._id} className="col-12 col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">{sch.name}</h5>
                    {sch.isDefault && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                        Default Shift
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      onClick={() => handleEdit(sch)}
                      className="btn btn-sm btn-outline-secondary p-1.5 rounded-2"
                      title="Edit Shift"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!sch.isDefault && (
                      <button
                        onClick={() => handleDelete(sch._id)}
                        className="btn btn-sm btn-outline-danger p-1.5 rounded-2"
                        title="Delete Shift"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="my-3 p-3 bg-light rounded-3">
                  <div className="d-flex justify-content-between font-monospace text-dark fw-bold mb-1">
                    <span>{sch.startTime}</span>
                    <span className="text-muted">➔</span>
                    <span>{sch.endTime}</span>
                  </div>
                  <span className="text-muted small">
                    Required Working: <strong>{Math.round(sch.requiredWorkingMinutes / 60)} Hours</strong>
                  </span>
                </div>

                <div className="small text-muted mb-3 space-y-1">
                  <div>Grace Period: <strong className="text-dark">{sch.gracePeriodMinutes} mins</strong></div>
                  <div>Half-Day Threshold: <strong className="text-dark">{Math.round(sch.halfDayThresholdMinutes / 60)} hrs</strong></div>
                  <div>Geofence Verification: <strong className="text-dark">{sch.requireLocationVerification ? 'Enforced' : 'Optional'}</strong></div>
                </div>

                {/* Working Days Chips */}
                <div className="d-flex flex-wrap gap-1 mt-auto pt-2 border-top">
                  {sch.workingDays?.map((d) => (
                    <span key={d} className="badge bg-secondary-subtle text-secondary small">
                      {d.substring(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create / Edit Schedule Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingId ? 'Edit Attendance Shift' : 'Create New Attendance Shift'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label small fw-bold">Shift Name</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Standard Morning Faculty Shift"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-6">
                        <label className="form-label small fw-bold">Start Time (HH:mm)</label>
                        <input
                          type="time"
                          className="form-control"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-bold">End Time (HH:mm)</label>
                        <input
                          type="time"
                          className="form-control"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-4">
                        <label className="form-label small fw-bold">Grace Period (Mins)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.gracePeriodMinutes}
                          onChange={(e) => setForm({ ...form, gracePeriodMinutes: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small fw-bold">Half-Day (Mins)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.halfDayThresholdMinutes}
                          onChange={(e) => setForm({ ...form, halfDayThresholdMinutes: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small fw-bold">Full Day (Mins)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.requiredWorkingMinutes}
                          onChange={(e) => setForm({ ...form, requiredWorkingMinutes: Number(e.target.value) })}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-bold d-block mb-2">Institutional Working Days</label>
                        <div className="d-flex flex-wrap gap-2">
                          {allWeekdays.map((day) => (
                            <button
                              type="button"
                              key={day}
                              onClick={() => handleToggleDay(day)}
                              className={`btn btn-sm rounded-pill ${
                                form.workingDays.includes(day) ? 'btn-primary' : 'btn-outline-secondary'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="col-12 mt-3">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="geoSwitch"
                            checked={form.requireLocationVerification}
                            onChange={(e) => setForm({ ...form, requireLocationVerification: e.target.checked })}
                          />
                          <label className="form-check-label small fw-semibold" htmlFor="geoSwitch">
                            Require Geofence Verification (50m radius)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary fw-bold">
                      Save Shift Policy
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

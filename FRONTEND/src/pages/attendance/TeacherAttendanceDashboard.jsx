import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Coffee,
  LogIn,
  LogOut,
  RefreshCw,
  FileEdit,
  ShieldCheck,
  UserCheck,
  Building,
  BookOpen
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import AttendanceSemiCircle from '../../components/attendance/AttendanceSemiCircle.jsx';
import attendanceService from '../../services/attendanceService.js';

export default function TeacherAttendanceDashboard() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geoState, setGeoState] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: 'idle', // 'idle' | 'locating' | 'ready' | 'denied' | 'error'
    errorMsg: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedPunchIn: '',
    requestedPunchOut: '',
    reason: '',
  });

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch teacher's attendance & schedule
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getMyAttendance();
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load attendance info' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    requestLocation();
  }, []);

  // Browser Geolocation Request
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoState((prev) => ({
        ...prev,
        status: 'error',
        errorMsg: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    setGeoState((prev) => ({ ...prev, status: 'locating', errorMsg: '' }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          status: 'ready',
          errorMsg: '',
        });
      },
      (err) => {
        let msg = 'Location access denied or unavailable.';
        if (err.code === 1) msg = 'Location permission denied by user.';
        else if (err.code === 2) msg = 'Location position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setGeoState({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: 'denied',
          errorMsg: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Punch In Handler
  const handlePunchIn = async () => {
    if (geoState.status !== 'ready' || !geoState.latitude) {
      setMessage({
        type: 'error',
        text: 'Please allow GPS location access to punch in.',
      });
      requestLocation();
      return;
    }

    try {
      setPunchLoading(true);
      setMessage({ type: '', text: '' });
      const res = await attendanceService.punchIn({
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy: geoState.accuracy,
      });

      if (res.data?.success) {
        setMessage({ type: 'success', text: res.data.message });
        await fetchAttendance();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Punch in failed',
      });
    } finally {
      setPunchLoading(false);
    }
  };

  // Punch Out Handler
  const handlePunchOut = async () => {
    try {
      setPunchLoading(true);
      setMessage({ type: '', text: '' });
      const res = await attendanceService.punchOut({
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy: geoState.accuracy,
      });

      if (res.data?.success) {
        setMessage({ type: 'success', text: res.data.message });
        await fetchAttendance();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Punch out failed',
      });
    } finally {
      setPunchLoading(false);
    }
  };

  // Break Toggle Handler
  const handleToggleBreak = async (action) => {
    try {
      setPunchLoading(true);
      const res = await attendanceService.toggleBreak({ action });
      if (res.data?.success) {
        setMessage({ type: 'success', text: res.data.message });
        await fetchAttendance();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Break action failed' });
    } finally {
      setPunchLoading(false);
    }
  };

  // Correction Request Submit
  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await attendanceService.requestCorrection({
        attendanceId: todayRecord?._id,
        ...correctionForm,
      });
      if (res.data?.success) {
        setMessage({ type: 'success', text: res.data.message });
        setShowCorrectionModal(false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Request failed' });
    }
  };

  const todayRecord = data?.today;
  const schedule = data?.schedule;
  const teacherProfile = data?.teacher || user;

  // Working & Remaining calculations
  const requiredMins = schedule?.requiredWorkingMinutes || 480;
  let completedMins = todayRecord?.effectiveWorkingMinutes || 0;
  let remainingMins = Math.max(0, requiredMins - completedMins);
  let attendancePercent = 0;

  if (todayRecord?.punchInTime) {
    if (!todayRecord.punchOutTime) {
      // Actively working: compute live duration
      const punchInDate = new Date(todayRecord.punchInTime);
      const elapsed = Math.max(0, Math.round((currentTime - punchInDate) / 60000));
      const breakMins = todayRecord.totalBreakMinutes || 0;
      completedMins = Math.max(0, elapsed - breakMins);
      remainingMins = Math.max(0, requiredMins - completedMins);
    }
    attendancePercent = Math.min(100, Math.round((completedMins / requiredMins) * 100));
  }

  // Active status resolution
  let currentStatus = 'Not Punched In';
  if (todayRecord?.punchInTime) {
    if (todayRecord.isOnBreak) {
      currentStatus = 'Break';
    } else if (!todayRecord.punchOutTime) {
      currentStatus = todayRecord.lateMinutes > 0 ? 'Late' : 'Working';
    } else {
      currentStatus = todayRecord.status || 'Completed';
    }
  }

  return (
    <div className="d-flex min-vh-100 bg-light">
      <Sidebar user={user} />
      <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header with Title and Live Clock */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <UserCheck className="text-primary" /> Teacher Attendance Portal
            </h2>
            <p className="text-muted small mb-0">
              Biometric & GPS geofenced attendance terminal for institutional faculty.
            </p>
          </div>

          <div className="d-flex align-items-center gap-3 bg-white px-3 py-2 rounded-3 shadow-sm border">
            <div className="text-end">
              <div className="small text-muted font-monospace">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="fw-bold text-dark fs-5 font-monospace">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
            <button
              onClick={fetchAttendance}
              className="btn btn-sm btn-outline-secondary rounded-circle p-2"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Alert Messages */}
        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show d-flex align-items-center gap-2`} role="alert">
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <div>{message.text}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        {/* Main Grid: Teacher Profile & Attendance Circle */}
        <div className="row g-4 mb-4">
          
          {/* Left Column: Teacher Identity Card */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3 pb-3 border-bottom mb-3">
                  <img
                    src={teacherProfile.profilePhoto || 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png'}
                    alt="Profile"
                    className="rounded-circle border"
                    style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                  />
                  <div>
                    <h5 className="fw-bold text-dark mb-1">{teacherProfile.name}</h5>
                    <div className="badge bg-primary-subtle text-primary border border-primary-subtle me-2">
                      ID: {teacherProfile.teacherProfile?.employeeId || teacherProfile.schoolId || 'FACULTY'}
                    </div>
                    <span className="small text-muted">
                      {teacherProfile.designation || 'Senior Faculty'}
                    </span>
                  </div>
                </div>

                <div className="row g-3 small">
                  <div className="col-6">
                    <span className="text-muted d-block">Department</span>
                    <strong className="text-dark d-flex align-items-center gap-1 mt-0.5">
                      <Building size={14} className="text-primary" />
                      {teacherProfile.department || 'Academics'}
                    </strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Assigned Subject</span>
                    <strong className="text-dark d-flex align-items-center gap-1 mt-0.5">
                      <BookOpen size={14} className="text-primary" />
                      {teacherProfile.teacherProfile?.subject || 'All Subjects'}
                    </strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Scheduled Shift</span>
                    <strong className="text-dark font-monospace mt-0.5">
                      {schedule ? `${schedule.startTime} - ${schedule.endTime}` : '09:00 - 17:00'}
                    </strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Grace Period</span>
                    <strong className="text-dark mt-0.5">
                      {schedule?.gracePeriodMinutes || 10} Minutes
                    </strong>
                  </div>
                </div>

                {/* GPS Location Status Pill */}
                <div className="mt-4 p-3 rounded-3 bg-light border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-bold text-secondary d-flex align-items-center gap-1">
                      <MapPin size={15} className="text-danger" /> Geofence Verification (50m Radius)
                    </span>
                    <button
                      onClick={requestLocation}
                      className="btn btn-link btn-sm p-0 text-decoration-none text-primary"
                    >
                      Re-check GPS
                    </button>
                  </div>
                  <div className="small">
                    {geoState.status === 'locating' && (
                      <span className="text-muted">Acquiring high-accuracy satellite fix...</span>
                    )}
                    {geoState.status === 'ready' && (
                      <span className="text-success fw-semibold">
                        GPS Active (Accuracy: {Math.round(geoState.accuracy)}m)
                      </span>
                    )}
                    {geoState.status === 'denied' && (
                      <span className="text-danger fw-semibold">{geoState.errorMsg}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 180-Degree Attendance Circle & Live Actions */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4 d-flex flex-column justify-content-between">
                
                {/* 180 Degree Gauge */}
                <div className="py-2">
                  <AttendanceSemiCircle
                    percentage={attendancePercent}
                    status={currentStatus}
                    completedMinutes={completedMins}
                    requiredMinutes={requiredMins}
                    remainingMinutes={remainingMins}
                    size={280}
                  />
                </div>

                {/* Punch In / Out / Break Control Bar */}
                <div className="d-flex flex-wrap gap-2 justify-content-center mt-3 pt-3 border-top">
                  {/* Punch In Button */}
                  {!todayRecord?.punchInTime ? (
                    <button
                      onClick={handlePunchIn}
                      disabled={punchLoading || geoState.status !== 'ready'}
                      className="btn btn-success px-4 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 shadow-sm"
                    >
                      <LogIn size={18} />
                      {punchLoading ? 'Verifying...' : 'Punch In Now'}
                    </button>
                  ) : !todayRecord?.punchOutTime ? (
                    <>
                      {/* Break Toggle */}
                      {todayRecord.isOnBreak ? (
                        <button
                          onClick={() => handleToggleBreak('end')}
                          disabled={punchLoading}
                          className="btn btn-warning px-4 py-2 rounded-3 fw-bold d-flex align-items-center gap-2"
                        >
                          <Coffee size={18} /> End Break
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleBreak('start')}
                          disabled={punchLoading}
                          className="btn btn-outline-warning px-4 py-2 rounded-3 fw-semibold d-flex align-items-center gap-2"
                        >
                          <Coffee size={18} /> Take Break
                        </button>
                      )}

                      {/* Punch Out Button */}
                      <button
                        onClick={handlePunchOut}
                        disabled={punchLoading}
                        className="btn btn-danger px-4 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 shadow-sm"
                      >
                        <LogOut size={18} />
                        {punchLoading ? 'Saving...' : 'Punch Out'}
                      </button>
                    </>
                  ) : (
                    <div className="badge bg-secondary-subtle text-secondary px-3 py-2 rounded-3 fs-6">
                      Shift Completed for Today
                    </div>
                  )}

                  {/* Correction Request Trigger */}
                  <button
                    onClick={() => setShowCorrectionModal(true)}
                    className="btn btn-outline-secondary px-3 py-2 rounded-3 small d-flex align-items-center gap-1"
                  >
                    <FileEdit size={16} /> Request Correction
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Summary Strip */}
        {todayRecord && (
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-3">Today's Session Telemetry</h6>
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Punch In Time</div>
                  <div className="fw-bold text-dark font-monospace">
                    {todayRecord.punchInTime
                      ? new Date(todayRecord.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Not Recorded'}
                  </div>
                  {todayRecord.lateMinutes > 0 && (
                    <span className="badge bg-danger-subtle text-danger small mt-1">
                      {todayRecord.lateMinutes} mins late
                    </span>
                  )}
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Punch Out Time</div>
                  <div className="fw-bold text-dark font-monospace">
                    {todayRecord.punchOutTime
                      ? new Date(todayRecord.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'In Progress'}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Total Break Taken</div>
                  <div className="fw-bold text-dark font-monospace">
                    {todayRecord.totalBreakMinutes || 0} Minutes
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">GPS Verification Status</div>
                  <div className="fw-bold text-success d-flex align-items-center gap-1">
                    <ShieldCheck size={16} />
                    {todayRecord.punchInLocation?.statusMessage || 'Verified'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Correction Request Modal */}
        {showCorrectionModal && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Submit Attendance Correction</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCorrectionModal(false)}></button>
                </div>
                <form onSubmit={handleCorrectionSubmit}>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={correctionForm.date}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Requested Punch In Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={correctionForm.requestedPunchIn}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, requestedPunchIn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Requested Punch Out Time (Optional)</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={correctionForm.requestedPunchOut}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, requestedPunchOut: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Reason for Adjustment</label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Explain technical failure, on-duty exam assignment, etc."
                        value={correctionForm.reason}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                        required
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCorrectionModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary fw-bold">
                      Submit for Approval
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

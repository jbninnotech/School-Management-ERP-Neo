import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Save,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Compass
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import attendanceService from '../../services/attendanceService.js';

export default function GeofencingManagement() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    schoolName: 'Main Campus',
    latitude: 28.6139,
    longitude: 77.2090,
    radiusMeters: 50,
    strictGeofence: true,
    address: '',
  });

  const [testCoords, setTestCoords] = useState({ lat: '', lng: '', result: null });

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getSchoolLocation();
      if (res.data?.success && res.data.location) {
        setForm({
          schoolName: res.data.location.schoolName || 'Main Campus',
          latitude: res.data.location.latitude || 28.6139,
          longitude: res.data.location.longitude || 77.2090,
          radiusMeters: res.data.location.radiusMeters || 50,
          strictGeofence: res.data.location.strictGeofence !== false,
          address: res.data.location.address || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const res = await attendanceService.updateSchoolLocation(form);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Geofence and location policy updated successfully!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update geofence' });
    } finally {
      setSaving(false);
    }
  };

  // Test Distance Calculator using Haversine
  const handleTestDistance = () => {
    if (!testCoords.lat || !testCoords.lng) return;
    const R = 6371e3;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(parseFloat(testCoords.lat) - parseFloat(form.latitude));
    const dLon = toRad(parseFloat(testCoords.lng) - parseFloat(form.longitude));
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(parseFloat(form.latitude))) *
        Math.cos(toRad(parseFloat(testCoords.lat))) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.round(R * c);

    setTestCoords((prev) => ({
      ...prev,
      result: {
        distanceMeters: dist,
        isWithin: dist <= form.radiusMeters,
      },
    }));
  };

  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }));
        },
        (err) => alert(err.message),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="min-vh-100 bg-light overflow-x-hidden">
      <Sidebar user={user} />
      <style>{`
        .geofencing-main {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding-top: 58px;
        }
        @media (min-width: 992px) {
          .geofencing-main {
            width: calc(100% - 260px);
            margin-left: 260px;
            padding-top: 0;
          }
        }
      `}</style>
      <main className="geofencing-main p-3 p-md-4">
        <div className="w-100 mx-auto" style={{ maxWidth: '1100px' }}>
        
        {/* Header */}
        <div className="mb-4">
          <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <Compass className="text-primary" /> Location & 50-Meter Geofencing Configuration
          </h2>
          <p className="text-muted small mb-0">
            Define campus boundaries. Attendance punches are validated on the backend using Haversine spherical distance.
          </p>
        </div>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        <div className="row g-4">
          {/* Geofence Form */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-bold text-dark mb-3">Campus Coordinates & Security Zone</h5>
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Campus Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control font-monospace"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control font-monospace"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  className="btn btn-sm btn-outline-primary mb-3 d-flex align-items-center gap-1"
                >
                  <Navigation size={14} /> Detect Current Device Location as Campus Center
                </button>

                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Permitted Geofence Radius (Meters)
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control font-monospace"
                      value={form.radiusMeters}
                      onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                      required
                    />
                    <span className="input-group-text bg-light">Meters</span>
                  </div>
                  <small className="text-muted">Standard institutional policy: 50 Meters</small>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Campus Address / Gate Description</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Gate 1, Main Administrative Block"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="form-check form-switch mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="strictCheck"
                    checked={form.strictGeofence}
                    onChange={(e) => setForm({ ...form, strictGeofence: e.target.checked })}
                  />
                  <label className="form-check-label small fw-semibold" htmlFor="strictCheck">
                    Enforce Strict Geofencing (Reject punches outside radius)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary fw-bold px-4 py-2 rounded-3 d-flex align-items-center gap-2"
                >
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Geofence Policy'}
                </button>
              </form>
            </div>
          </div>

          {/* Haversine Testing Sandbox Card */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
              <h5 className="fw-bold text-dark mb-2">Distance Verification Simulator</h5>
              <p className="text-muted small">
                Test how faculty coordinates will evaluate against your configured campus boundary.
              </p>

              <div className="mb-3">
                <label className="form-label small fw-bold">Test Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="form-control form-control-sm font-monospace"
                  placeholder="28.6140"
                  value={testCoords.lat}
                  onChange={(e) => setTestCoords({ ...testCoords, lat: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">Test Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="form-control form-control-sm font-monospace"
                  placeholder="77.2091"
                  value={testCoords.lng}
                  onChange={(e) => setTestCoords({ ...testCoords, lng: e.target.value })}
                />
              </div>

              <button
                type="button"
                onClick={handleTestDistance}
                className="btn btn-sm btn-outline-dark w-100 fw-bold mb-3"
              >
                Simulate Verification
              </button>

              {testCoords.result && (
                <div className={`p-3 rounded-3 border ${testCoords.result.isWithin ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}`}>
                  <div className="fw-bold mb-1">
                    {testCoords.result.isWithin ? '✅ Location Verified' : '❌ Outside Permitted Radius'}
                  </div>
                  <div className="small">
                    Computed Distance: <strong>{testCoords.result.distanceMeters} meters</strong>
                  </div>
                  <div className="small text-muted">
                    Permitted Limit: {form.radiusMeters} meters
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        </div>
      </main>
    </div>
  );
}

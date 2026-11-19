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
  const [locating, setLocating] = useState(false);
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
          latitude: res.data.location.latitude ?? 28.6139,
          longitude: res.data.location.longitude ?? 77.2090,
          radiusMeters: res.data.location.radiusMeters ?? 50,
          strictGeofence: res.data.location.strictGeofence !== false,
          address: res.data.location.address || '',
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load geofence configuration.',
      });
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
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radiusMeters: Number(form.radiusMeters),
      };
      const res = await attendanceService.updateSchoolLocation(payload);
      if (res.data?.success) {
        setMessage({
          type: 'success',
          text: 'Geofence and location policy updated successfully!',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update geofence',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test Distance Calculator using Haversine
  const handleTestDistance = () => {
    if (testCoords.lat === '' || testCoords.lng === '') return;

    const lat1 = parseFloat(form.latitude);
    const lon1 = parseFloat(form.longitude);
    const lat2 = parseFloat(testCoords.lat);
    const lon2 = parseFloat(testCoords.lng);

    if ([lat1, lon1, lat2, lon2].some(Number.isNaN)) return;

    const R = 6371e3;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.round(R * c);

    setTestCoords((prev) => ({
      ...prev,
      result: {
        distanceMeters: dist,
        isWithin: dist <= Number(form.radiusMeters || 0),
      },
    }));
  };

  // Quick-fill & simulate test coordinates at an exact meter offset from campus center
  const simulateOffsetMeters = (meters) => {
    const baseLat = parseFloat(form.latitude);
    const baseLng = parseFloat(form.longitude);
    if (Number.isNaN(baseLat) || Number.isNaN(baseLng)) return;

    const R = 6371e3;
    const dLatDeg = (meters / R) * (180 / Math.PI);
    const testLat = Number((baseLat + dLatDeg).toFixed(8));
    const testLng = Number(baseLng.toFixed(8));

    setTestCoords({
      lat: String(testLat),
      lng: String(testLng),
      result: {
        distanceMeters: Math.round(Math.abs(meters)),
        isWithin: Math.round(Math.abs(meters)) <= Number(form.radiusMeters || 0),
      },
    });
  };

  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      setMessage({
        type: 'error',
        text: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setLocating(true);
    setMessage({ type: '', text: '' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      (err) => {
        setMessage({
          type: 'error',
          text: err.message || 'Unable to fetch current location.',
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

      <main className="geofencing-main">
        <div className="p-3 p-sm-4">
          <div className="mx-auto w-100" style={{ maxWidth: '1100px' }}>
            {/* Header */}
            <div className="mb-3 mb-md-4">
              <h2 className="h4 fw-bold text-dark mb-1 d-flex align-items-start align-items-sm-center gap-2">
                <Compass className="text-primary flex-shrink-0 mt-1 mt-sm-0" size={24} />
                <span>Location &amp; {form.radiusMeters || 50}-Meter Geofencing Configuration</span>
              </h2>
              <p className="text-muted small mb-0">
                Define campus boundaries. Attendance punches are validated on the backend using Haversine spherical distance.
              </p>
            </div>

            {/* Feedback Banner */}
            {message.text && (
              <div
                className={`alert ${
                  message.type === 'error' ? 'alert-danger' : 'alert-success'
                } alert-dismissible fade show d-flex align-items-start gap-2`}
                role="alert"
              >
                {message.type === 'error' ? (
                  <AlertCircle size={18} className="flex-shrink-0 mt-1" />
                ) : (
                  <CheckCircle2 size={18} className="flex-shrink-0 mt-1" />
                )}
                <div className="flex-grow-1 text-break">{message.text}</div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setMessage({ type: '', text: '' })}
                />
              </div>
            )}

            {loading ? (
              <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white text-center">
                <div className="spinner-border text-primary mx-auto mb-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted small mb-0">Loading geofence configuration...</p>
              </div>
            ) : (
              <div className="row g-3 g-md-4">
                {/* Geofence Form */}
                <div className="col-12 col-xl-7">
                  <div className="card border-0 shadow-sm rounded-4 p-3 p-sm-4 bg-white h-100">
                    <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <MapPin size={18} className="text-primary flex-shrink-0" />
                      <span>Campus Coordinates &amp; Security Zone</span>
                    </h5>

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
                        <div className="col-12 col-sm-6">
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
                        <div className="col-12 col-sm-6">
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

                      <div className="d-grid d-sm-flex mb-3">
                        <button
                          type="button"
                          onClick={handleUseCurrentGPS}
                          disabled={locating}
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3"
                        >
                          <Navigation size={14} className="flex-shrink-0" />
                          <span>
                            {locating
                              ? 'Detecting Device Location...'
                              : 'Detect Current Device Location as Campus Center'}
                          </span>
                        </button>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold">
                          Permitted Geofence Radius (Meters)
                        </label>
                        <div className="input-group">
                          <input
                            type="number"
                            min="1"
                            className="form-control font-monospace"
                            value={form.radiusMeters}
                            onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
                            required
                          />
                          <span className="input-group-text bg-light">Meters</span>
                        </div>
                        <small className="text-muted">Standard institutional policy: 50 Meters</small>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold">
                          Campus Address / Gate Description
                        </label>
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

                      <div className="d-grid d-sm-flex">
                        <button
                          type="submit"
                          disabled={saving}
                          className="btn btn-primary fw-bold px-4 py-2 rounded-3 d-inline-flex align-items-center justify-content-center gap-2"
                        >
                          <Save size={18} className="flex-shrink-0" />
                          <span>{saving ? 'Saving...' : 'Save Geofence Policy'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Haversine Testing Sandbox Card */}
                <div className="col-12 col-xl-5">
                  <div className="card border-0 shadow-sm rounded-4 p-3 p-sm-4 bg-white h-100">
                    <h5 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                      <ShieldCheck size={18} className="text-primary flex-shrink-0" />
                      <span>Distance Verification Simulator</span>
                    </h5>
                    <p className="text-muted small">
                      Test how faculty coordinates will evaluate against your configured campus boundary.
                    </p>

                    <div className="row g-3 mb-3">
                      <div className="col-12 col-sm-6 col-xl-12">
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

                      <div className="col-12 col-sm-6 col-xl-12">
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
                    </div>

                    {/* Quick 50m Preset Buttons */}
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => simulateOffsetMeters(0)}
                        className="btn btn-sm btn-outline-success"
                      >
                        Test 0m
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateOffsetMeters(25)}
                        className="btn btn-sm btn-outline-success"
                      >
                        Test 25m
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateOffsetMeters(50)}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Test 50m Limit
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateOffsetMeters(75)}
                        className="btn btn-sm btn-outline-danger"
                      >
                        Test 75m (Outside)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestDistance}
                      disabled={testCoords.lat === '' || testCoords.lng === ''}
                      className="btn btn-sm btn-outline-dark w-100 fw-bold py-2 mb-3"
                    >
                      Simulate Verification
                    </button>

                    {testCoords.result && (
                      <div
                        className={`p-3 rounded-3 border ${
                          testCoords.result.isWithin
                            ? 'bg-success-subtle border-success text-success-emphasis'
                            : 'bg-danger-subtle border-danger text-danger-emphasis'
                        }`}
                      >
                        <div className="fw-bold mb-1 d-flex align-items-center gap-2">
                          {testCoords.result.isWithin ? (
                            <>
                              <CheckCircle2 size={16} className="flex-shrink-0" />
                              <span>Location Verified</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} className="flex-shrink-0" />
                              <span>Outside Permitted Radius</span>
                            </>
                          )}
                        </div>
                        <div className="small">
                          Computed Distance: <strong>{testCoords.result.distanceMeters} meters</strong>
                        </div>
                        <div className="small opacity-75">
                          Permitted Limit: {form.radiusMeters} meters
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
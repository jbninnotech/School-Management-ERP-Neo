import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar.jsx';

// Read API Base URL from .env
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';

const AddTeacher = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    password: 'Teacher@2026', // Default temporary password
    gender: '',
    dob: '',
    currentAddress: '',
    emergencyContact: '',
    employeeId: '',
    subject: '',
    qualification: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '', schoolId: '' });

  // Handle Text/Select Input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (alert.message) setAlert({ type: '', message: '', schoolId: '' });
  };

  // Handle File Selection and Live Preview
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setAlert({ type: 'danger', message: 'Image size must be less than 3MB' });
        return;
      }
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ type: '', message: '', schoolId: '' });

    const token = sessionStorage.getItem('token');
    if (!token) {
      setAlert({
        type: 'danger',
        message: 'Unauthorized: Please log in as Super Admin or Principal.',
      });
      setLoading(false);
      return;
    }

    try {
      // Build multipart/form-data for Cloudinary upload
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) data.append(key, formData[key]);
      });

      if (profilePhoto) {
        data.append('profilePhoto', profilePhoto);
      }

      const cleanUrl = API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/auth/add-teacher`, {
        method: 'POST',
        headers: {
          // DO NOT manually set Content-Type; the browser sets boundary automatically
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const resData = await response.json();

      if (!response.ok || !resData?.success || !resData?.data?.name) {
        throw new Error(resData?.message || 'The server did not confirm teacher registration');
      }

      // Success
      setAlert({
        type: 'success',
        message: `Teacher "${resData.data.name}" added successfully!`,
        schoolId: resData.data.schoolId,
      });

      // Reset form
      setFormData(initialFormState);
      setProfilePhoto(null);
      setPhotoPreview(null);
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        <div className="container-fluid py-0">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">

          <div className="card border-0 shadow-sm" style={styles.card}>
            <div className="card-body p-4 p-md-5">

              {/* Header */}
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                  <h4 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
                    <i className="bi bi-person-plus text-primary me-2"></i>
                    Register New Teacher
                  </h4>
                  <p className="text-muted small mb-0">
                    Add teacher credentials, institutional details, and profile photo
                  </p>
                </div>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill mt-2 mt-md-0">
                  <i className="bi bi-shield-check me-1"></i> ID: Auto-Generated
                </span>
              </div>

              {/* Alert Notification */}
              {alert.message && (
                <div
                  className={`alert alert-${alert.type} border-0 py-3 px-4 mb-4 d-flex align-items-center justify-content-between rounded-3`}
                  role="alert"
                >
                  <div className="d-flex align-items-center">
                    <i
                      className={`bi ${
                        alert.type === 'success'
                          ? 'bi-check-circle-fill fs-5 text-success'
                          : 'bi-exclamation-triangle-fill fs-5 text-danger'
                      } me-3`}
                    ></i>
                    <div>
                      <div>{alert.message}</div>
                      {alert.schoolId && (
                        <div className="small fw-bold mt-1">
                          Assigned School ID: <span className="badge bg-success">{alert.schoolId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setAlert({ type: '', message: '', schoolId: '' })}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* 1. Photo Upload & Preview Section */}
                <div className="p-3 mb-4 rounded-3" style={styles.photoUploadBox}>
                  <div className="d-flex flex-column flex-sm-row align-items-center gap-3">
                    <div style={styles.avatarPreview}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" style={styles.avatarImg} />
                      ) : (
                        <i className="bi bi-person text-secondary" style={{ fontSize: '2.5rem' }}></i>
                      )}
                    </div>
                    <div className="flex-grow-1 text-center text-sm-start">
                      <label className="form-label fw-semibold small text-dark mb-1">
                        Profile Photo <span className="text-muted fw-normal">(Cloudinary Upload)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="form-control form-control-sm"
                        onChange={handlePhotoChange}
                        style={{ maxWidth: '350px' }}
                      />
                      <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                        Supports JPG, PNG, WEBP (Max 3MB). Stored directly on Cloudinary CDN.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Personal Information */}
                <h6 className="fw-bold text-secondary text-uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  Personal Information
                </h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Eleanor Vance"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-semibold text-secondary">Gender</label>
                    <select
                      name="gender"
                      className="form-select"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label small fw-semibold text-secondary">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      className="form-control"
                      value={formData.dob}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* 3. Contact Details */}
                <h6 className="fw-bold text-secondary text-uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  Contact Information
                </h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      placeholder="teacher@school.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Mobile Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Emergency Contact</label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      className="form-control"
                      placeholder="+91 9811122233"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold text-secondary">Current Residential Address</label>
                    <textarea
                      name="currentAddress"
                      rows="2"
                      className="form-control"
                      placeholder="Flat no., Street, City, State, PIN"
                      value={formData.currentAddress}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>

                {/* 4. Institutional & Profile Information */}
                <h6 className="fw-bold text-secondary text-uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  Institutional & Profile Information
                </h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Employee ID</label>
                    <input
                      type="text"
                      name="employeeId"
                      className="form-control"
                      placeholder="EMP-TEA-01"
                      value={formData.employeeId}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Subject Specialization</label>
                    <input
                      type="text"
                      name="subject"
                      className="form-control"
                      placeholder="e.g. Mathematics / Physics"
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Qualification</label>
                    <input
                      type="text"
                      name="qualification"
                      className="form-control"
                      placeholder="e.g. M.Sc., B.Ed."
                      value={formData.qualification}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Temporary Account Password *</label>
                    <input
                      type="text"
                      name="password"
                      className="form-control"
                      placeholder="Initial login password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      The teacher can change this password after their first login.
                    </small>
                  </div>
                </div>

                <hr className="my-4" style={{ borderColor: '#e2e8f0' }} />

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={() => {
                      setFormData(initialFormState);
                      setProfilePhoto(null);
                      setPhotoPreview(null);
                    }}
                    disabled={loading}
                  >
                    Reset Form
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-semibold"
                    style={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Uploading to Cloudinary & Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-2"></i> Register Teacher
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>

        </div>
      </div>
    </div>
      </main>
    </div>
  );
};

const styles = {
  card: {
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
  },
  photoUploadBox: {
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
  },
  avatarPreview: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '2px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    borderRadius: '8px',
  },
};

export default AddTeacher;
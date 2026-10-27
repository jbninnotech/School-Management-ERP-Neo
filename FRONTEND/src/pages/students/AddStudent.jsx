import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import { UserPlus, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function AddStudent() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Student@2026',
    rollNumber: '',
    classGrade: 'Class 10',
    section: 'A',
    parentName: '',
    parentPhone: '',
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '', schoolId: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (alert.message) setAlert({ type: '', message: '', schoolId: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert({ type: '', message: '', schoolId: '' });

    try {
      const res = await API.post('/auth/add-student', formData);
      if (!res.data?.success || !res.data?.data?.name) {
        throw new Error(res.data?.message || 'The server did not confirm student enrollment');
      }
      setAlert({
        type: 'success',
        message: `Student "${res.data.data.name}" enrolled successfully!`,
        schoolId: res.data.data.schoolId,
      });
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: 'Student@2026',
        rollNumber: '',
        classGrade: 'Class 10',
        section: 'A',
        parentName: '',
        parentPhone: '',
      });
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Failed to enroll student',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        
        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
          <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ minWidth: 0 }}>
            <Link to="/students" className="btn btn-outline-secondary btn-sm rounded-circle p-2">
              <ArrowLeft size={16} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <h4 className="fw-bold mb-1 text-dark">Enroll New Student Candidate</h4>
              <p className="text-muted small mb-0">Register student profile and assign class/section for examination eligibility</p>
            </div>
          </div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill">
            <ShieldCheck size={14} className="me-1 inline" /> ID: Auto-Generated
          </span>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex align-items-center justify-content-between mb-4`}>
            <div>
              <div className="fw-semibold">{alert.message}</div>
              {alert.schoolId && (
                <div className="small mt-1">Assigned School ID: <strong>{alert.schoolId}</strong></div>
              )}
            </div>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        <div className="row justify-content-center">
          <div className="col-12 col-xl-9">
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 p-md-5">
              <form onSubmit={handleSubmit}>
                <h6 className="fw-bold text-secondary text-uppercase mb-3 small" style={{ letterSpacing: '0.5px' }}>
                  Student Credentials & Personal Info
                </h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Full Legal Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Aryan Sharma"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Student Email *</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      placeholder="student@neo.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Mobile / Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      placeholder="+91 9812345678"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Initial Login Password *</label>
                    <input
                      type="text"
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <h6 className="fw-bold text-secondary text-uppercase mb-3 small" style={{ letterSpacing: '0.5px' }}>
                  Class & Examination Placement
                </h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Class / Grade *</label>
                    <select
                      name="classGrade"
                      className="form-select"
                      value={formData.classGrade}
                      onChange={handleChange}
                      required
                    >
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                      {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Section *</label>
                    <select
                      name="section"
                      className="form-select"
                      value={formData.section}
                      onChange={handleChange}
                      required
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                      <option value="Science">Science (Sr Sec)</option>
                      <option value="Commerce">Commerce (Sr Sec)</option>
                      <option value="Humanities">Humanities (Sr Sec)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold text-secondary">Roll Number *</label>
                    <input
                      type="text"
                      name="rollNumber"
                      className="form-control font-monospace"
                      placeholder="e.g. 1001"
                      value={formData.rollNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <h6 className="fw-bold text-secondary text-uppercase mb-3 small" style={{ letterSpacing: '0.5px' }}>
                  Parent / Guardian Details
                </h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Parent / Guardian Name</label>
                    <input
                      type="text"
                      name="parentName"
                      className="form-control"
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.parentName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-secondary">Parent Contact Number</label>
                    <input
                      type="tel"
                      name="parentPhone"
                      className="form-control"
                      placeholder="+91 9812345670"
                      value={formData.parentPhone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 border-top pt-4">
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/students')}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                    style={{ backgroundColor: '#2563eb' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" />
                        Registering Student...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} /> Complete Enrollment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

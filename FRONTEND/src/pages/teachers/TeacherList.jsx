import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api';

const TeacherList = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch teachers from backend
  const fetchTeachers = async () => {
    setLoading(true);
    const token = sessionStorage.getItem('token');

    try {
      const cleanUrl = API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/auth/teachers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch teachers');
      }

      setTeachers(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Filter teachers by Name, Email, Subject, or School ID
  const filteredTeachers = teachers.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.schoolId?.toLowerCase().includes(term) ||
      t.teacherProfile?.subject?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        <div className="container-fluid py-0">
      
      {/* Header Section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
            Faculty & Teachers Directory
          </h3>
          <p className="text-muted small mb-0">
            Manage, search, and view all registered teaching personnel
          </p>
        </div>
        <Link
          to="/teachers/add"
          className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center mt-2 mt-sm-0"
          style={{ backgroundColor: '#2563eb', borderRadius: '8px', border: 'none' }}
        >
          <i className="bi bi-person-plus-fill me-2"></i> Add New Teacher
        </Link>
      </div>

      {/* Stats Counter Bar */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-md-4">
          <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: '#eff6ff' }}>
            <span className="text-muted small fw-semibold">Total Faculty</span>
            <h3 className="fw-bold text-primary mb-0">{teachers.length}</h3>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-4">
          <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: '#f0fdf4' }}>
            <span className="text-muted small fw-semibold">Active Status</span>
            <h3 className="fw-bold text-success mb-0">
              {teachers.filter((t) => t.isActive).length}
            </h3>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-4">
          <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
            <span className="text-muted small fw-semibold">Departments / Subjects</span>
            <h3 className="fw-bold text-secondary mb-0">
              {new Set(teachers.map((t) => t.teacherProfile?.subject).filter(Boolean)).size}
            </h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search by Teacher Name, School ID, Subject, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ boxShadow: 'none' }}
            />
            {searchTerm && (
              <button
                className="btn btn-outline-secondary border-start-0"
                type="button"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        <div className="card-body p-0">
          
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading faculty members...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger m-4">{error}</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-person-x fs-1"></i>
              <p className="mt-2 mb-0">No teachers found matching your search.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr className="small text-secondary text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3">School ID</th>
                    <th className="py-3">Contact</th>
                    <th className="py-3">Subject / Role</th>
                    <th className="py-3">Gender / DOB</th>
                    <th className="py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher._id || teacher.schoolId}>
                      
                      {/* Name + Cloudinary Avatar */}
                      <td className="py-3 px-4">
                        <div className="d-flex align-items-center">
                          <img
                            src={teacher.profilePhoto || 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png'}
                            alt={teacher.name}
                            className="rounded-circle me-3 object-fit-cover shadow-sm"
                            style={{ width: '42px', height: '42px', border: '1px solid #cbd5e1' }}
                            onError={(e) => {
                              e.target.src = 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png';
                            }}
                          />
                          <div>
                            <span className="fw-bold d-block text-dark">{teacher.name}</span>
                            <small className="text-muted">{teacher.teacherProfile?.qualification || 'Faculty Member'}</small>
                          </div>
                        </div>
                      </td>

                      {/* School ID Badge */}
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1 fw-semibold font-monospace">
                          {teacher.schoolId || 'N/A'}
                        </span>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="small">
                          <i className="bi bi-envelope me-1 text-muted"></i> {teacher.email}
                        </div>
                        <div className="small text-muted">
                          <i className="bi bi-telephone me-1"></i> {teacher.phone}
                        </div>
                      </td>

                      {/* Subject */}
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                          {teacher.teacherProfile?.subject || 'General'}
                        </span>
                      </td>

                      {/* Gender & DOB */}
                      <td className="small text-muted">
                        <div>{teacher.gender || 'Not Specified'}</div>
                        {teacher.dob && (
                          <div style={{ fontSize: '0.75rem' }}>
                            DOB: {new Date(teacher.dob).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="text-center">
                        <span
                          className={`badge ${
                            teacher.isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                          } px-3 py-1 rounded-pill`}
                        >
                          {teacher.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

    </div>
      </main>
    </div>
  );
};

export default TeacherList;
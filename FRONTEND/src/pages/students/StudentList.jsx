import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import { Search, UserPlus, GraduationCap, CheckCircle2 } from 'lucide-react';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const url = selectedClass ? `/auth/students?classGrade=${encodeURIComponent(selectedClass)}` : '/auth/students';
      const res = await API.get(url);
      setStudents(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  const filtered = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.schoolId?.toLowerCase().includes(term) ||
      s.studentProfile?.rollNumber?.toLowerCase().includes(term) ||
      s.studentProfile?.classGrade?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        
        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark">Students Directory</h3>
            <p className="text-muted small mb-0">
              Manage enrollments, class placements, and candidate exam credentials
            </p>
          </div>
          <Link
            to="/students/add"
            className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 rounded-3 shadow-sm"
            style={{ backgroundColor: '#2563eb' }}
          >
            <UserPlus size={16} /> Enroll New Student
          </Link>
        </div>

        {/* Filters */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-8">
            <div className="input-group bg-white rounded-3 shadow-sm border">
              <span className="input-group-text bg-transparent border-0"><Search size={16} className="text-muted" /></span>
              <input
                type="text"
                className="form-control border-0"
                placeholder="Search by student name, roll number, school ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn btn-link text-muted" onClick={() => setSearchTerm('')}>Clear</button>
              )}
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select bg-white shadow-sm"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes (LKG - 12)</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
              {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter cards */}
        <div className="row g-3 mb-4">
          <div className="col-sm-4">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Total Students</span>
              <h3 className="fw-bold text-primary mb-0">{students.length}</h3>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Class 10 Candidates</span>
              <h3 className="fw-bold text-success mb-0">
                {students.filter((s) => s.studentProfile?.classGrade === 'Class 10').length}
              </h3>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Active Registrations</span>
              <h3 className="fw-bold text-info mb-0">
                {students.filter((s) => s.isActive).length}
              </h3>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2 text-muted small">Loading students roster...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger m-4">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <GraduationCap size={40} className="text-secondary opacity-50 mb-2" />
                <p className="mb-0">No registered students found.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary small text-uppercase" style={{ fontSize: '0.72rem' }}>
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th>Class & Section</th>
                      <th>Roll Number</th>
                      <th>School ID</th>
                      <th>Contact Info</th>
                      <th>Parent / Guardian</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s._id}>
                        <td className="py-3 px-4">
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center me-3"
                              style={{ width: 38, height: 38 }}
                            >
                              {s.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">{s.name}</div>
                              <small className="text-muted">{s.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                            {s.studentProfile?.classGrade || 'N/A'} - Sec {s.studentProfile?.section || 'A'}
                          </span>
                        </td>
                        <td className="fw-bold font-monospace text-secondary">
                          {s.studentProfile?.rollNumber || '---'}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                            {s.schoolId || 'N/A'}
                          </span>
                        </td>
                        <td className="small text-muted">{s.phone}</td>
                        <td className="small">
                          <div>{s.studentProfile?.parentName || '---'}</div>
                          <small className="text-muted">{s.studentProfile?.parentPhone || ''}</small>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1">
                            <CheckCircle2 size={12} className="me-1 inline" /> Active
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

      </main>
    </div>
  );
}

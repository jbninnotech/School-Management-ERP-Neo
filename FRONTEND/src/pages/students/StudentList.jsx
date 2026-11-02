import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import studentService from '../../services/studentService.js';
import uploadService from '../../services/uploadService.js';
import {
  Search,
  UserPlus,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RotateCcw,
  Eye,
  Camera,
  Award,
} from 'lucide-react';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Modals
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [performanceData, setPerformanceData] = useState([]);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = ['superadmin', 'principal', 'admin'].includes(user.role);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = selectedClass ? { classGrade: selectedClass } : {};
      const res = await studentService.getStudents(params);
      setStudents(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  const handleOpenEdit = (stu) => {
    setEditStudent(stu);
    setEditFormData({
      name: stu.name,
      email: stu.email,
      phone: stu.phone,
      classGrade: stu.studentProfile?.classGrade || 'Class 10',
      section: stu.studentProfile?.section || 'A',
      rollNumber: stu.studentProfile?.rollNumber || '',
      parentName: stu.studentProfile?.parentName || '',
      parentPhone: stu.studentProfile?.parentPhone || '',
      profilePhoto: stu.profilePhoto || '',
      photoPublicId: stu.photoPublicId || '',
    });
  };

  const handleOpenView = async (stu) => {
    setViewStudent(stu);
    try {
      const res = await studentService.getStudentQuestionPerformance(stu._id);
      setPerformanceData(res.data || []);
    } catch {
      setPerformanceData([]);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await studentService.updateStudent(editStudent._id, editFormData);
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to update student profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (stu) => {
    if (window.confirm(`Are you sure you want to soft-delete candidate ${stu.name}? All examination attempts and scores will be safely kept.`)) {
      try {
        await studentService.deleteStudent(stu._id);
        fetchStudents();
      } catch (err) {
        alert(err.message || 'Delete failed');
      }
    }
  };

  const handleRestore = async (stu) => {
    try {
      await studentService.restoreStudent(stu._id);
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Restore failed');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await uploadService.uploadProfilePhoto(file, 'student');
      setEditFormData((prev) => ({
        ...prev,
        profilePhoto: res.data.photoUrl,
        photoPublicId: res.data.photoPublicId,
      }));
    } catch (err) {
      alert('Photo upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setPhotoUploading(false);
    }
  };

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
              Manage enrollments, photos, class placements, and candidate exam credentials
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/students/add"
              className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 rounded-3 shadow-sm"
              style={{ backgroundColor: '#2563eb' }}
            >
              <UserPlus size={16} /> Enroll New Student
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-8">
            <div className="input-group bg-white rounded-3 shadow-sm border">
              <span className="input-group-text bg-transparent border-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-0"
                placeholder="Search by student name, roll number, school ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn btn-link text-muted" onClick={() => setSearchTerm('')}>
                  Clear
                </button>
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
                <option key={cls} value={cls}>
                  {cls}
                </option>
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
                {students.filter((s) => s.isActive && !s.isDeleted).length}
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
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s._id} style={{ opacity: s.isDeleted ? 0.6 : 1 }}>
                        <td className="py-3 px-4">
                          <div className="d-flex align-items-center">
                            {s.profilePhoto && !s.profilePhoto.includes('demo/image/upload/v1/avatar.png') ? (
                              <img
                                src={s.profilePhoto}
                                alt={s.name}
                                className="rounded-circle me-3 object-fit-cover shadow-sm"
                                style={{ width: 38, height: 38, border: '1px solid #cbd5e1' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center me-3"
                                style={{ width: 38, height: 38 }}
                              >
                                {s.name?.charAt(0) || 'S'}
                              </div>
                            )}
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
                          {s.isDeleted ? (
                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-1">
                              <XCircle size={12} className="me-1 inline" /> Deleted
                            </span>
                          ) : (
                            <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1">
                              <CheckCircle2 size={12} className="me-1 inline" /> Active
                            </span>
                          )}
                        </td>
                        <td className="text-end px-4">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              className="btn btn-sm btn-outline-secondary p-1"
                              onClick={() => handleOpenView(s)}
                              title="View Profile & Performance"
                            >
                              <Eye size={14} />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-primary p-1"
                                  onClick={() => handleOpenEdit(s)}
                                  title="Edit Profile & Photo"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {s.isDeleted ? (
                                  <button
                                    className="btn btn-sm btn-outline-success p-1"
                                    onClick={() => handleRestore(s)}
                                    title="Restore Student"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-outline-danger p-1"
                                    onClick={() => handleDelete(s)}
                                    title="Soft Delete Student"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* View Profile Modal with Question Performance Tab */}
        {viewStudent && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Candidate Profile & Performance</h5>
                  <button className="btn-close" onClick={() => setViewStudent(null)} />
                </div>
                <div className="modal-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-3">
                    {viewStudent.profilePhoto && !viewStudent.profilePhoto.includes('demo/image/upload/v1/avatar.png') ? (
                      <img
                        src={viewStudent.profilePhoto}
                        alt={viewStudent.name}
                        className="rounded-circle object-fit-cover shadow-sm"
                        style={{ width: 64, height: 64 }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
                        style={{ width: 64, height: 64, fontSize: '1.5rem' }}
                      >
                        {viewStudent.name?.charAt(0) || 'S'}
                      </div>
                    )}
                    <div>
                      <h5 className="fw-bold mb-0 text-dark">{viewStudent.name}</h5>
                      <div className="text-muted small">
                        {viewStudent.studentProfile?.classGrade} - Sec {viewStudent.studentProfile?.section} • Roll #{' '}
                        {viewStudent.studentProfile?.rollNumber || '-'} • School ID: {viewStudent.schoolId}
                      </div>
                      <small className="text-secondary">{viewStudent.email} • {viewStudent.phone}</small>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                    <Award size={18} className="text-primary" /> Topic-Level Question Bank Performance
                  </h6>

                  {performanceData.length === 0 ? (
                    <div className="alert alert-secondary small">
                      No question attempts recorded for this candidate yet.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Topic</th>
                            <th>Subject</th>
                            <th>Questions Attempted</th>
                            <th>Correct</th>
                            <th>Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceData.map((p, idx) => (
                            <tr key={idx}>
                              <td className="fw-semibold">{p.topic}</td>
                              <td>{p.subject}</td>
                              <td>{p.attempted}</td>
                              <td>{p.correct}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    p.accuracy >= 70 ? 'bg-success' : p.accuracy >= 40 ? 'bg-warning text-dark' : 'bg-danger'
                                  }`}
                                >
                                  {p.accuracy}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setViewStudent(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Student Modal with Photo Upload */}
        {editStudent && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Edit Candidate Profile</h5>
                  <button className="btn-close" onClick={() => setEditStudent(null)} />
                </div>
                <form onSubmit={handleSaveEdit}>
                  <div className="modal-body p-4">
                    {/* Photo upload header */}
                    <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-3">
                      {editFormData.profilePhoto && !editFormData.profilePhoto.includes('demo/image/upload/v1/avatar.png') ? (
                        <img
                          src={editFormData.profilePhoto}
                          alt="Preview"
                          className="rounded-circle object-fit-cover shadow-sm"
                          style={{ width: 64, height: 64 }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
                          style={{ width: 64, height: 64 }}
                        >
                          {editFormData.name?.charAt(0) || 'S'}
                        </div>
                      )}
                      <div>
                        <label className="btn btn-sm btn-outline-primary fw-semibold d-flex align-items-center gap-1 mb-1">
                          <Camera size={14} /> {photoUploading ? 'Uploading...' : 'Change Cloudinary Photo'}
                          <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} disabled={photoUploading} />
                        </label>
                        <div className="small text-muted">Upload square JPG/PNG under 3MB</div>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Legal Name *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Email Address *</label>
                        <input
                          type="email"
                          required
                          className="form-control"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Class Grade *</label>
                        <select
                          className="form-select"
                          value={editFormData.classGrade}
                          onChange={(e) => setEditFormData({ ...editFormData, classGrade: e.target.value })}
                        >
                          {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Section *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.section}
                          onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Roll Number *</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={editFormData.rollNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          className="form-control"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Parent / Guardian Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.parentName}
                          onChange={(e) => setEditFormData({ ...editFormData, parentName: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditStudent(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={editLoading}>
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

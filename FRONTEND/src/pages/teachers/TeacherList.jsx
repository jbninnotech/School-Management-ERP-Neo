import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import teacherService from '../../services/teacherService.js';
import uploadService from '../../services/uploadService.js';
import {
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RotateCcw,
  Eye,
  Camera,
  BookOpen,
  Award,
} from 'lucide-react';

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [viewTeacher, setViewTeacher] = useState(null);
  const [teacherBankData, setTeacherBankData] = useState(null);
  const [editTeacher, setEditTeacher] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = ['superadmin', 'principal', 'admin'].includes(user.role);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await teacherService.getTeachers();
      setTeachers(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch teachers directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenEdit = (t) => {
    setEditTeacher(t);
    setEditFormData({
      name: t.name,
      email: t.email,
      phone: t.phone,
      employeeId: t.teacherProfile?.employeeId || '',
      subject: t.teacherProfile?.subject || '',
      qualification: t.teacherProfile?.qualification || '',
      gender: t.gender || '',
      currentAddress: t.currentAddress || '',
      profilePhoto: t.profilePhoto || '',
      photoPublicId: t.photoPublicId || '',
    });
  };

  const handleOpenView = async (t) => {
    setViewTeacher(t);
    try {
      const res = await teacherService.getTeacherQuestionBank(t._id);
      setTeacherBankData(res.data);
    } catch {
      setTeacherBankData(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await teacherService.updateTeacher(editTeacher._id, editFormData);
      setEditTeacher(null);
      fetchTeachers();
    } catch (err) {
      alert(err.message || 'Failed to update faculty member');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (t) => {
    if (window.confirm(`Are you sure you want to soft-delete faculty member ${t.name}?`)) {
      try {
        await teacherService.deleteTeacher(t._id);
        fetchTeachers();
      } catch (err) {
        alert(err.message || 'Delete operation failed');
      }
    }
  };

  const handleRestore = async (t) => {
    try {
      await teacherService.restoreTeacher(t._id);
      fetchTeachers();
    } catch (err) {
      alert(err.message || 'Restore operation failed');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await uploadService.uploadProfilePhoto(file, 'teacher');
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

  const filtered = teachers.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.schoolId?.toLowerCase().includes(term) ||
      t.teacherProfile?.employeeId?.toLowerCase().includes(term) ||
      t.teacherProfile?.subject?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        {/* Header Section */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: '#0f172a' }}>
              Faculty & Teachers Directory
            </h3>
            <p className="text-muted small mb-0">
              Manage, search, and view all registered teaching personnel and linked question banks
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/teachers/add"
              className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center rounded-3 shadow-sm"
              style={{ backgroundColor: '#2563eb' }}
            >
              <UserPlus size={16} className="me-2" /> Add New Teacher
            </Link>
          )}
        </div>

        {/* Stats Counter Bar */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-4">
            <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: '#eff6ff' }}>
              <span className="text-muted small fw-semibold">Total Faculty</span>
              <h3 className="fw-bold text-primary mb-0">{teachers.length}</h3>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: '#f0fdf4' }}>
              <span className="text-muted small fw-semibold">Active Status</span>
              <h3 className="fw-bold text-success mb-0">
                {teachers.filter((t) => t.isActive && !t.isDeleted).length}
              </h3>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="card border-0 shadow-sm p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
              <span className="text-muted small fw-semibold">Departments / Subjects</span>
              <h3 className="fw-bold text-secondary mb-0">
                {new Set(teachers.map((t) => t.teacherProfile?.subject).filter(Boolean)).size}
              </h3>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="input-group bg-white rounded-3 shadow-sm border mb-4">
          <span className="input-group-text bg-transparent border-0">
            <Search size={16} className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-0"
            placeholder="Search by Teacher Name, School ID, Subject, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="btn btn-link text-muted" onClick={() => setSearchTerm('')}>
              Clear
            </button>
          )}
        </div>

        {/* Table Section */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2 text-muted small">Loading faculty members...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger m-4">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <Users size={40} className="text-secondary opacity-50 mb-2" />
                <p className="mb-0">No teachers found matching your search.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-secondary text-uppercase" style={{ fontSize: '0.75rem' }}>
                    <tr>
                      <th className="py-3 px-4">Faculty Member</th>
                      <th>School ID</th>
                      <th>Contact</th>
                      <th>Subject / Role</th>
                      <th>Gender / Address</th>
                      <th className="text-center">Status</th>
                      <th className="text-end px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((teacher) => (
                      <tr key={teacher._id} style={{ opacity: teacher.isDeleted ? 0.6 : 1 }}>
                        <td className="py-3 px-4">
                          <div className="d-flex align-items-center">
                            {teacher.profilePhoto && !teacher.profilePhoto.includes('demo/image/upload/v1/avatar.png') ? (
                              <img
                                src={teacher.profilePhoto}
                                alt={teacher.name}
                                className="rounded-circle me-3 object-fit-cover shadow-sm"
                                style={{ width: 42, height: 42, border: '1px solid #cbd5e1' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center me-3"
                                style={{ width: 42, height: 42 }}
                              >
                                {teacher.name?.charAt(0) || 'T'}
                              </div>
                            )}
                            <div>
                              <span className="fw-bold d-block text-dark">{teacher.name}</span>
                              <small className="text-muted">{teacher.teacherProfile?.qualification || 'Faculty Member'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                            {teacher.schoolId || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="small text-dark">{teacher.email}</div>
                          <div className="small text-muted">{teacher.phone}</div>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                            {teacher.teacherProfile?.subject || 'General'}
                          </span>
                        </td>
                        <td className="small text-muted">
                          <div>{teacher.gender || 'Not specified'}</div>
                          <small>{teacher.currentAddress || '-'}</small>
                        </td>
                        <td className="text-center">
                          {teacher.isDeleted ? (
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
                              onClick={() => handleOpenView(teacher)}
                              title="View Profile & Question Bank"
                            >
                              <Eye size={14} />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-primary p-1"
                                  onClick={() => handleOpenEdit(teacher)}
                                  title="Edit Profile & Photo"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {teacher.isDeleted ? (
                                  <button
                                    className="btn btn-sm btn-outline-success p-1"
                                    onClick={() => handleRestore(teacher)}
                                    title="Restore Teacher"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-outline-danger p-1"
                                    onClick={() => handleDelete(teacher)}
                                    title="Soft Delete Teacher"
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

        {/* View Profile & Linked Question Bank Modal */}
        {viewTeacher && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Faculty Profile & Linked Question Assets</h5>
                  <button className="btn-close" onClick={() => setViewTeacher(null)} />
                </div>
                <div className="modal-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-3">
                    {viewTeacher.profilePhoto && !viewTeacher.profilePhoto.includes('demo/image/upload/v1/avatar.png') ? (
                      <img
                        src={viewTeacher.profilePhoto}
                        alt={viewTeacher.name}
                        className="rounded-circle object-fit-cover shadow-sm"
                        style={{ width: 64, height: 64 }}
                      />
                    ) : (
                      <div
                        className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
                        style={{ width: 64, height: 64, fontSize: '1.5rem' }}
                      >
                        {viewTeacher.name?.charAt(0) || 'T'}
                      </div>
                    )}
                    <div>
                      <h5 className="fw-bold mb-0 text-dark">{viewTeacher.name}</h5>
                      <div className="text-muted small">
                        Department: <strong>{viewTeacher.teacherProfile?.subject || 'General'}</strong> • Emp ID:{' '}
                        {viewTeacher.teacherProfile?.employeeId || '-'} • School ID: {viewTeacher.schoolId}
                      </div>
                      <small className="text-secondary">{viewTeacher.email} • {viewTeacher.phone}</small>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <BookOpen size={18} className="text-primary" /> Authored Question Bank Contributions
                  </h6>

                  <div className="row g-3 mb-3">
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <span className="text-muted small">Authored Questions</span>
                        <h4 className="fw-bold text-primary mb-0">{teacherBankData?.totalQuestions || 0}</h4>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <span className="text-muted small">Question Papers</span>
                        <h4 className="fw-bold text-success mb-0">{teacherBankData?.totalPapers || 0}</h4>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-light rounded-3 text-center">
                        <span className="text-muted small">Exams Conducted</span>
                        <h4 className="fw-bold text-dark mb-0">{teacherBankData?.totalExams || 0}</h4>
                      </div>
                    </div>
                  </div>

                  {teacherBankData?.questions?.length > 0 && (
                    <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light small">
                          <tr>
                            <th>Question</th>
                            <th>Class</th>
                            <th>Topic</th>
                            <th>Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherBankData.questions.slice(0, 10).map((q) => (
                            <tr key={q._id}>
                              <td style={{ maxWidth: 260 }}>
                                <div className="text-truncate small">{q.questionText}</div>
                              </td>
                              <td className="small">{q.classGrade}</td>
                              <td className="small text-muted">{q.topic || 'General'}</td>
                              <td className="small fw-bold">{q.marks}M</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setViewTeacher(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Faculty Modal with Photo Upload */}
        {editTeacher && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Edit Faculty Profile</h5>
                  <button className="btn-close" onClick={() => setEditTeacher(null)} />
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
                          {editFormData.name?.charAt(0) || 'T'}
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
                        <label className="form-label small fw-bold">Employee ID</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={editFormData.employeeId}
                          onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Subject / Department</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.subject}
                          onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Qualification</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.qualification}
                          onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
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
                        <label className="form-label small fw-bold">Current Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.currentAddress}
                          onChange={(e) => setEditFormData({ ...editFormData, currentAddress: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditTeacher(null)}>
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

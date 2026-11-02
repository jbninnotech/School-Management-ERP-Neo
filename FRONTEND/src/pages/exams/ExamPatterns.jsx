import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import examPatternService from '../../services/examPatternService.js';
import teacherService from '../../services/teacherService.js';
import {
  Layers,
  PlusCircle,
  Edit2,
  Trash2,
  Users,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';

export default function ExamPatterns() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = ['superadmin', 'principal', 'admin'].includes(user.role);

  const [patterns, setPatterns] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    classGrade: 'Class 10',
    subject: 'Mathematics',
    durationMinutes: 60,
    totalMarks: 50,
    passingMarks: 20,
    negativeMarking: false,
    maxWarnings: 3,
    instructions: 'Follow standard examination regulations.',
    sections: [
      {
        name: 'Section A - Objective MCQ',
        questionType: 'single_mcq',
        numberOfQuestions: 10,
        marksPerQuestion: 1,
        negativeMarksPerQuestion: 0,
      },
      {
        name: 'Section B - Short Answer',
        questionType: 'short_answer',
        numberOfQuestions: 10,
        marksPerQuestion: 2,
        negativeMarksPerQuestion: 0,
      },
      {
        name: 'Section C - Long Answer',
        questionType: 'long_answer',
        numberOfQuestions: 4,
        marksPerQuestion: 5,
        negativeMarksPerQuestion: 0,
      },
    ],
    assignedTeachers: [],
  });

  const [assignModalPattern, setAssignModalPattern] = useState(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const res = await examPatternService.getPatterns();
      setPatterns(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load exam patterns');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await teacherService.getTeachers();
      setTeachers(res.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchPatterns();
    if (isAdmin) fetchTeachers();
  }, []);

  const handleOpenCreate = () => {
    setEditingPattern(null);
    setFormData({
      name: '',
      classGrade: 'Class 10',
      subject: 'Mathematics',
      durationMinutes: 60,
      totalMarks: 50,
      passingMarks: 20,
      negativeMarking: false,
      maxWarnings: 3,
      instructions: 'Follow standard examination regulations.',
      sections: [
        {
          name: 'Section A - Objective MCQ',
          questionType: 'single_mcq',
          numberOfQuestions: 10,
          marksPerQuestion: 1,
          negativeMarksPerQuestion: 0,
        },
      ],
      assignedTeachers: [],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (pattern) => {
    setEditingPattern(pattern);
    setFormData({
      name: pattern.name,
      classGrade: pattern.classGrade,
      subject: pattern.subject,
      durationMinutes: pattern.durationMinutes,
      totalMarks: pattern.totalMarks,
      passingMarks: pattern.passingMarks,
      negativeMarking: Boolean(pattern.negativeMarking),
      maxWarnings: pattern.maxWarnings || 3,
      instructions: pattern.instructions || '',
      sections: pattern.sections || [],
      assignedTeachers: (pattern.assignedTeachers || []).map((t) => t._id || t),
    });
    setShowModal(true);
  };

  const handleAddSection = () => {
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          name: `Section ${String.fromCharCode(65 + formData.sections.length)}`,
          questionType: 'single_mcq',
          numberOfQuestions: 5,
          marksPerQuestion: 1,
          negativeMarksPerQuestion: 0,
        },
      ],
    });
  };

  const handleRemoveSection = (index) => {
    const updated = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: updated });
  };

  const handleSectionChange = (index, field, value) => {
    const updated = [...formData.sections];
    updated[index][field] = value;
    // Auto-calculate total marks
    const computedTotal = updated.reduce(
      (sum, sec) => sum + (Number(sec.numberOfQuestions) || 0) * (Number(sec.marksPerQuestion) || 0),
      0
    );
    setFormData({
      ...formData,
      sections: updated,
      totalMarks: computedTotal > 0 ? computedTotal : formData.totalMarks,
    });
  };

  const handleSavePattern = async (e) => {
    e.preventDefault();
    try {
      if (editingPattern) {
        await examPatternService.updatePattern(editingPattern._id, formData);
      } else {
        await examPatternService.createPattern(formData);
      }
      setShowModal(false);
      fetchPatterns();
    } catch (err) {
      alert(err.message || 'Error saving pattern');
    }
  };

  const handleDeletePattern = async (id) => {
    if (window.confirm('Are you sure you want to soft-delete this exam pattern?')) {
      try {
        await examPatternService.deletePattern(id);
        fetchPatterns();
      } catch (err) {
        alert(err.message || 'Error deleting pattern');
      }
    }
  };

  const handleOpenAssign = (pattern) => {
    setAssignModalPattern(pattern);
    setSelectedTeacherIds((pattern.assignedTeachers || []).map((t) => t._id || t));
  };

  const handleSaveAssignment = async () => {
    if (!assignModalPattern) return;
    try {
      await examPatternService.assignTeachers(assignModalPattern._id, selectedTeacherIds);
      setAssignModalPattern(null);
      fetchPatterns();
    } catch (err) {
      alert(err.message || 'Failed to assign teachers');
    }
  };

  const filteredPatterns = patterns.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !classFilter || p.classGrade === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={user} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>
        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <Layers size={24} className="text-primary" /> Examination Patterns & Blueprints
            </h3>
            <p className="text-muted small mb-0">
              Standardize exam sections, question quotas, timing, and assign strict templates to teachers
            </p>
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 rounded-3 shadow-sm"
              style={{ backgroundColor: '#2563eb' }}
              onClick={handleOpenCreate}
            >
              <PlusCircle size={16} /> Create Exam Pattern
            </button>
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
                placeholder="Search by pattern name, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select bg-white shadow-sm"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All Classes</option>
              {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Patterns List */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted small mt-2">Loading official patterns...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : filteredPatterns.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted bg-white">
            <Layers size={48} className="mx-auto mb-2 text-secondary opacity-50" />
            <h5>No Exam Patterns Available</h5>
            <p className="small">
              {isAdmin
                ? 'Create standard templates to enforce section quotas and time limits for teachers.'
                : 'No exam patterns currently assigned to your account.'}
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredPatterns.map((pat) => (
              <div key={pat._id} className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-2">
                        {pat.classGrade}
                      </span>
                      <span className="badge bg-light text-dark border">{pat.subject}</span>
                    </div>
                    {isAdmin && (
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary p-1"
                          onClick={() => handleOpenAssign(pat)}
                          title="Assign to Teachers"
                        >
                          <Users size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary p-1"
                          onClick={() => handleOpenEdit(pat)}
                          title="Edit Pattern"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger p-1"
                          onClick={() => handleDeletePattern(pat._id)}
                          title="Delete Pattern"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <h5 className="fw-bold text-dark mb-1">{pat.name}</h5>
                  <div className="d-flex gap-3 small text-muted mb-3">
                    <span><Clock size={14} className="me-1 inline" /> {pat.durationMinutes} mins</span>
                    <span><Award size={14} className="me-1 inline" /> {pat.totalMarks} Marks (Pass: {pat.passingMarks})</span>
                    {pat.negativeMarking && <span className="text-danger">Negative Marking Enabled</span>}
                  </div>

                  {/* Sections list */}
                  <div className="bg-light p-3 rounded-3 mb-3 small">
                    <strong className="d-block mb-1 text-dark">Section Blueprint:</strong>
                    {pat.sections?.map((sec, sIdx) => (
                      <div key={sIdx} className="d-flex justify-content-between text-secondary py-1 border-bottom">
                        <span>{sec.name} ({sec.questionType?.replace('_', ' ')})</span>
                        <span className="font-monospace fw-semibold">
                          {sec.numberOfQuestions} Qs × {sec.marksPerQuestion}M = {sec.numberOfQuestions * sec.marksPerQuestion}M
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Assigned teachers info */}
                  <div className="small text-muted mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                    <span>
                      <Users size={14} className="me-1 inline text-primary" />
                      Assigned: {pat.assignedTeachers?.length || 0} Faculty
                    </span>
                    <span className="badge bg-success-subtle text-success">
                      <CheckCircle2 size={12} className="inline me-1" /> Active Template
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingPattern ? 'Edit Exam Pattern' : 'Create Standard Exam Pattern'}
                  </h5>
                  <button className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <form onSubmit={handleSavePattern}>
                  <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Pattern Name *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          placeholder="e.g., CBSE Class 10 Mid-Term Standard"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-bold">Class / Grade *</label>
                        <select
                          className="form-select"
                          value={formData.classGrade}
                          onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                        >
                          {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-bold">Subject *</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-md-3">
                        <label className="form-label small fw-bold">Duration (Minutes) *</label>
                        <input
                          type="number"
                          required
                          min="10"
                          className="form-control"
                          value={formData.durationMinutes}
                          onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-bold">Total Marks *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="form-control"
                          value={formData.totalMarks}
                          onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-bold">Passing Marks *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="form-control"
                          value={formData.passingMarks}
                          onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small fw-bold">Max Warnings</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="form-control"
                          value={formData.maxWarnings}
                          onChange={(e) => setFormData({ ...formData, maxWarnings: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    {/* Section Blueprint Quotas */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold text-dark mb-0">Sections & Question Quotas</h6>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddSection}>
                        + Add Section
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-2 mb-3">
                      {formData.sections.map((sec, idx) => (
                        <div key={idx} className="p-3 bg-light rounded-3 border">
                          <div className="row g-2 align-items-center">
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Section Name"
                                value={sec.name}
                                onChange={(e) => handleSectionChange(idx, 'name', e.target.value)}
                              />
                            </div>
                            <div className="col-md-3">
                              <select
                                className="form-select form-select-sm"
                                value={sec.questionType}
                                onChange={(e) => handleSectionChange(idx, 'questionType', e.target.value)}
                              >
                                <option value="single_mcq">Single MCQ</option>
                                <option value="multiple_select">Multiple Select</option>
                                <option value="true_false">True / False</option>
                                <option value="fill_blanks">Fill in Blanks</option>
                                <option value="short_answer">Short Answer</option>
                                <option value="long_answer">Long Answer</option>
                                <option value="numerical">Numerical</option>
                              </select>
                            </div>
                            <div className="col-md-2">
                              <input
                                type="number"
                                min="1"
                                placeholder="Count"
                                className="form-control form-control-sm"
                                value={sec.numberOfQuestions}
                                onChange={(e) => handleSectionChange(idx, 'numberOfQuestions', Number(e.target.value))}
                              />
                            </div>
                            <div className="col-md-2">
                              <input
                                type="number"
                                min="0.5"
                                step="any"
                                placeholder="Marks/Q"
                                className="form-control form-control-sm"
                                value={sec.marksPerQuestion}
                                onChange={(e) => handleSectionChange(idx, 'marksPerQuestion', Number(e.target.value))}
                              />
                            </div>
                            <div className="col-md-1 text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger p-1"
                                onClick={() => handleRemoveSection(idx)}
                                disabled={formData.sections.length <= 1}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary px-4 fw-semibold">
                      Save Pattern
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Assign Teachers Modal */}
        {assignModalPattern && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Assign Pattern to Teachers</h5>
                  <button className="btn-close" onClick={() => setAssignModalPattern(null)} />
                </div>
                <div className="modal-body p-4">
                  <p className="text-secondary small mb-3">
                    Select teachers eligible to build exams using <strong>{assignModalPattern.name}</strong>:
                  </p>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {teachers.map((t) => {
                      const isSelected = selectedTeacherIds.includes(t._id);
                      return (
                        <div
                          key={t._id}
                          className={`p-2 rounded-3 border d-flex justify-content-between align-items-center cursor-pointer ${
                            isSelected ? 'bg-primary-subtle border-primary text-primary fw-semibold' : 'bg-light'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTeacherIds(selectedTeacherIds.filter((id) => id !== t._id));
                            } else {
                              setSelectedTeacherIds([...selectedTeacherIds, t._id]);
                            }
                          }}
                        >
                          <div>
                            <div>{t.name}</div>
                            <small className="text-muted">{t.email} • {t.teacherProfile?.subject || 'Faculty'}</small>
                          </div>
                          <input type="checkbox" checked={isSelected} readOnly className="form-check-input" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setAssignModalPattern(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveAssignment}>
                    Save Assignments
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

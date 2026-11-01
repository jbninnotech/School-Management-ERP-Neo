import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  BookOpen,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

export default function QuestionPaperList() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Create paper quick modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Science');
  const [newClass, setNewClass] = useState('Class 10');
  const [newSection, setNewSection] = useState('A');
  const [newDuration, setNewDuration] = useState(60);
  const [creating, setCreating] = useState(false);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      let url = '/question-papers?';
      if (selectedClass) url += `classGrade=${encodeURIComponent(selectedClass)}&`;
      if (selectedStatus) url += `status=${encodeURIComponent(selectedStatus)}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await API.get(url);
      if (res.data?.success) {
        setPapers(res.data.data || []);
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.response?.data?.message || 'Failed to load question papers' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [selectedClass, selectedStatus]);

  const handleCreatePaper = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await API.post('/question-papers', {
        title: newTitle,
        subject: newSubject,
        classGrade: newClass,
        section: newSection,
        durationMinutes: Number(newDuration),
        status: 'draft',
      });
      if (res.data?.success) {
        setShowCreateModal(false);
        setNewTitle('');
        fetchPapers();
        setAlert({ type: 'success', message: 'Question paper created successfully!' });
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.response?.data?.message || 'Failed to create question paper' });
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (paperId) => {
    try {
      const res = await API.post(`/question-papers/${paperId}/duplicate`);
      if (res.data?.success) {
        setAlert({ type: 'success', message: 'Question paper duplicated successfully!' });
        fetchPapers();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.response?.data?.message || 'Failed to duplicate paper' });
    }
  };

  const handleDelete = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this question paper?')) return;
    try {
      const res = await API.delete(`/question-papers/${paperId}`);
      if (res.data?.success) {
        setAlert({ type: 'success', message: 'Question paper deleted successfully.' });
        fetchPapers();
      }
    } catch (err) {
      setAlert({ type: 'danger', message: err.response?.data?.message || 'Failed to delete question paper' });
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '24px 32px' }}>
        
        {/* Header Bar */}
        <div className="bg-white p-4 rounded-4 shadow-sm border mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle p-2 rounded-3">
                <BookOpen size={18} />
              </span>
              <h4 className="fw-bold text-dark mb-0">Master Question Papers</h4>
            </div>
            <p className="text-secondary small mb-0">
              Prepare question banks, mock blueprints, and test papers in advance, ready to attach to any live examination.
            </p>
          </div>

          <button
            className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold shadow-sm"
            onClick={() => setShowCreateModal(true)}
            style={{ backgroundColor: '#2563eb' }}
          >
            <Plus size={16} /> Create Question Paper
          </button>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 shadow-sm rounded-3 d-flex justify-content-between align-items-center mb-4`}>
            <span>{alert.message}</span>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        {/* Filter Controls */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <div className="input-group bg-white rounded-3 shadow-sm border">
              <span className="input-group-text bg-transparent border-0"><Search size={16} className="text-muted" /></span>
              <input
                type="text"
                className="form-control border-0"
                placeholder="Search by paper title or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchPapers(); }}
              />
              {search && (
                <button className="btn btn-link text-muted" onClick={() => { setSearch(''); fetchPapers(); }}>Clear</button>
              )}
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select bg-white shadow-sm"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select bg-white shadow-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready for Exam</option>
            </select>
          </div>
        </div>

        {/* Paper Cards List */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2">Loading Question Papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 text-center p-5 bg-white">
            <BookOpen size={48} className="mx-auto text-muted mb-3 opacity-50" />
            <h5 className="fw-bold text-dark">No Question Papers Found</h5>
            <p className="text-muted small mb-3">Create your first question paper template to quickly attach to upcoming examinations.</p>
            <div>
              <button className="btn btn-primary btn-sm px-4 rounded-3" onClick={() => setShowCreateModal(true)}>
                Create New Paper
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {papers.map((paper) => (
              <div key={paper._id} className="col-12 col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white position-relative">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-light text-dark border">
                      {paper.classGrade} • Sec {paper.section || 'A'}
                    </span>
                    <span className={`badge ${paper.status === 'ready' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'}`}>
                      {paper.status === 'ready' ? 'Ready for Exam' : 'Draft'}
                    </span>
                  </div>

                  <h5 className="fw-bold text-dark mb-1">{paper.title}</h5>
                  <div className="text-muted small mb-3">{paper.subject}</div>

                  <div className="bg-light p-3 rounded-3 small mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Questions:</span>
                      <strong className="text-dark">{paper.questions?.length || 0} Questions</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Total Marks:</span>
                      <strong className="text-dark">{paper.totalMarks || 0} Marks</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Suggested Time:</span>
                      <strong className="text-dark">{paper.durationMinutes || 60} mins</strong>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                    <span className="small text-muted">By {paper.createdBy?.name || 'Faculty'}</span>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-outline-secondary btn-sm p-1 rounded-2"
                        title="Duplicate Paper"
                        onClick={() => handleDuplicate(paper._id)}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm p-1 rounded-2"
                        title="Delete Paper"
                        onClick={() => handleDelete(paper._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Master Paper */}
        {showCreateModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow">
                <form onSubmit={handleCreatePaper}>
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title fw-bold text-dark">Create New Question Paper</h5>
                    <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)} />
                  </div>
                  <div className="modal-body p-4">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Paper Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Class 10 Mid-Term Physics Master Paper"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-secondary">Class / Grade *</label>
                        <select className="form-select" value={newClass} onChange={(e) => setNewClass(e.target.value)}>
                          {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-secondary">Section</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newSection}
                          onChange={(e) => setNewSection(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-secondary">Subject *</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold text-secondary">Duration (mins)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newDuration}
                          onChange={(e) => setNewDuration(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary px-4 fw-semibold" disabled={creating}>
                      {creating ? 'Creating...' : 'Create Paper'}
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

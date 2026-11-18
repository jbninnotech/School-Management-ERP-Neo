import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Search, 
  Filter, 
  Play, 
  Clock, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  XCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';

export default function VideoRecordingsManager() {
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Selected video for modal player
  const [activeVideo, setActiveVideo] = useState(null);

  const fetchRecordings = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 20,
      };
      if (search) params.search = search;
      if (classFilter) params.classGrade = classFilter;
      if (subjectFilter) params.subject = subjectFilter;
      if (statusFilter !== 'all') params.recordingStatus = statusFilter;

      const res = await API.get('/upload/recordings', { params });
      setRecordings(res.data?.data || []);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch examination recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [page, classFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecordings();
  };

  return (
    <div className="d-flex" style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <Sidebar user={currentUser} />

      <div className="flex-grow-1" style={{ marginLeft: '260px', padding: '28px', maxWidth: 'calc(100vw - 260px)' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
          <div>
            <h3 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
              <Video className="text-primary" /> Examination Video Recordings
            </h3>
            <p className="text-secondary small mb-0">
              Review and audit recorded student video feeds during live online proctored examinations
            </p>
          </div>
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
            onClick={fetchRecordings}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="card bg-dark border-secondary border-opacity-25 p-3 rounded-3 mb-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-dark border-secondary text-secondary">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="Search by student name or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm bg-dark text-white border-secondary"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Classes</option>
                {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select form-select-sm bg-dark text-white border-secondary"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Recording Statuses</option>
                <option value="completed">Completed Chunks</option>
                <option value="recording">In-Progress Feeds</option>
                <option value="interrupted">Interrupted</option>
                <option value="failed">Failed Uploads</option>
              </select>
            </div>

            <div className="col-md-2 d-flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm w-100">
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Recordings Table */}
        <div className="card bg-dark border-secondary border-opacity-25 rounded-3 shadow-sm overflow-hidden">
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0 align-middle">
              <thead>
                <tr className="border-secondary border-opacity-25 text-secondary small">
                  <th>Student Candidate</th>
                  <th>Examination / Subject</th>
                  <th>Class & Section</th>
                  <th>Chunk / Time</th>
                  <th>Status</th>
                  <th>Recorded At</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-secondary">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                      Loading examination video archives...
                    </td>
                  </tr>
                ) : recordings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-secondary">
                      <Video size={36} className="text-secondary opacity-50 mb-2" />
                      <div>No proctoring video recordings found for the selected criteria.</div>
                    </td>
                  </tr>
                ) : (
                  recordings.map((rec) => (
                    <tr key={rec._id} className="border-secondary border-opacity-25">
                      <td>
                        <div className="fw-semibold text-white">
                          {rec.student?.name || rec.studentName || 'Student'}
                        </div>
                        <small className="text-secondary font-monospace">
                          {rec.student?.schoolId || rec.student?._id?.substring(0, 8)}
                        </small>
                      </td>
                      <td>
                        <div className="text-white small fw-medium">
                          {rec.examination?.title || 'School Examination'}
                        </div>
                        <span className="badge bg-secondary-subtle text-light" style={{ fontSize: '0.7rem' }}>
                          {rec.subject || rec.examination?.subject || 'Subject'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary border-opacity-25">
                          {rec.classGrade || rec.examination?.classGrade || 'Class'}
                          {rec.section ? ` - ${rec.section}` : ''}
                        </span>
                      </td>
                      <td>
                        <div className="small font-monospace text-light">
                          Chunk #{rec.chunkIndex}
                        </div>
                        <small className="text-secondary">
                          {rec.durationSeconds ? `${rec.durationSeconds}s` : '15s'}
                        </small>
                      </td>
                      <td>
                        {rec.recordingStatus === 'completed' && (
                          <span className="badge bg-success-subtle text-success border border-success border-opacity-25">
                            Uploaded
                          </span>
                        )}
                        {rec.recordingStatus === 'recording' && (
                          <span className="badge bg-warning-subtle text-warning border border-warning border-opacity-25 animate-pulse">
                            Recording
                          </span>
                        )}
                        {['interrupted', 'failed'].includes(rec.recordingStatus) && (
                          <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25">
                            {rec.recordingStatus}
                          </span>
                        )}
                      </td>
                      <td className="small text-secondary">
                        {new Date(rec.timestamp || rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div style={{ fontSize: '0.7rem' }}>
                          {new Date(rec.timestamp || rec.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1"
                          onClick={() => setActiveVideo(rec)}
                        >
                          <Play size={12} /> Play Video
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {pagination.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top border-secondary border-opacity-25">
              <span className="text-secondary small">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} recordings)
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Player Modal */}
        {activeVideo && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content bg-dark text-white border-secondary">
                <div className="modal-header border-secondary border-opacity-25">
                  <h5 className="modal-title d-flex align-items-center gap-2">
                    <Video className="text-primary" size={18} />
                    {activeVideo.student?.name || activeVideo.studentName} — Proctoring Video
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setActiveVideo(null)}
                  />
                </div>
                <div className="modal-body p-0 bg-black text-center">
                  <video
                    src={activeVideo.mediaUrl}
                    controls
                    autoPlay
                    className="w-100"
                    style={{ maxHeight: '460px', outline: 'none' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="modal-footer border-secondary border-opacity-25 d-flex justify-content-between">
                  <div className="small text-secondary">
                    Exam: <strong>{activeVideo.examination?.title}</strong> • Time: {new Date(activeVideo.timestamp).toLocaleString()}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveVideo(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  Activity,
  Users,
  Clock,
  PlayCircle,
  Eye,
  AlertTriangle,
  FileCheck2,
  Calendar,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function LiveExamsSection() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'student';
  const isStudent = role === 'student';

  const [liveExams, setLiveExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLiveExams = async () => {
    try {
      const res = await API.get('/exams?status=live');
      if (res.data?.success) {
        setLiveExams(res.data.data || []);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load live examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveExams();
    const interval = setInterval(fetchLiveExams, 10000); // 10s live poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      <Sidebar user={currentUser} />

      <main style={{ marginLeft: '260px', padding: '24px 30px' }}>
        {/* Header Bar */}
        <div className="bg-white rounded-4 p-4 mb-4 border shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-danger d-flex align-items-center gap-1 px-3 py-2">
                <span className="spinner-grow spinner-grow-sm" role="status" style={{ width: 8, height: 8 }} />
                ACTIVE SESSION
              </span>
              <h4 className="fw-bold text-dark mb-0">Live Examination Center</h4>
            </div>
            <p className="text-secondary small mb-0">
              {isStudent
                ? 'Authorized online tests currently in progress for your class and section.'
                : 'Real-time proctoring, student attendance, active violations, and conduct controls.'}
            </p>
          </div>

          <button onClick={fetchLiveExams} className="btn btn-outline-primary btn-sm rounded-3">
            Refresh Now
          </button>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2">Checking for live examinations...</p>
          </div>
        ) : liveExams.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 text-center py-5 p-4 bg-white">
            <Activity size={48} className="mx-auto text-muted mb-2 opacity-50" />
            <h5 className="fw-bold text-dark">No Examinations are Currently LIVE</h5>
            <p className="text-muted small mb-3">
              {isStudent
                ? 'Your scheduled tests will appear here once your teacher or administrator clicks "GO LIVE".'
                : 'Approved examinations can be started from your Examination Hub or Teacher Dashboard.'}
            </p>
            <div>
              <Link to="/exams" className="btn btn-primary btn-sm px-4 rounded-3">
                Go to Examination Hub
              </Link>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {liveExams.map((exam) => (
              <div key={exam._id} className="col-12 col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white position-relative overflow-hidden">
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      backgroundColor: '#ef4444',
                    }}
                  />

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold">
                      ● LIVE NOW
                    </span>
                    <span className="badge bg-light text-dark border font-monospace">
                      {exam.examCode}
                    </span>
                  </div>

                  <h5 className="fw-bold text-dark mb-1">{exam.title}</h5>
                  <div className="text-muted small mb-3">
                    {exam.classGrade} • {exam.subject}
                  </div>

                  <div className="bg-light p-3 rounded-3 mb-3 small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Total Marks:</span>
                      <strong className="text-dark">{exam.totalMarks} Marks</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Duration:</span>
                      <strong className="text-dark">{exam.durationMinutes} Minutes</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Proctoring:</span>
                      <span className="badge bg-success-subtle text-success">Camera + Geo Active</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-2">
                    {isStudent ? (
                      <button
                        onClick={() => navigate(`/exams/${exam._id}/take`)}
                        className="btn btn-primary w-100 fw-bold py-2 rounded-3 d-flex align-items-center justify-content-center gap-2"
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        <PlayCircle size={18} /> Join & Start Exam
                      </button>
                    ) : (
                      <div className="d-flex gap-2">
                        <Link
                          to={`/exams/${exam._id}/monitor`}
                          className="btn btn-outline-primary flex-grow-1 fw-semibold btn-sm py-2 rounded-3 d-flex align-items-center justify-content-center gap-1"
                        >
                          <Eye size={16} /> Live Monitor
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
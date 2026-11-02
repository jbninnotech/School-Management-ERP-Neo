import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/api.js';
import { 
  GraduationCap, 
  Users, 
  UserPlus,
  Calendar, 
  LogOut, 
  BookOpen,
  FileCheck2,
  FileText,
  PlusCircle,
  Database,
  CheckSquare,
  BarChart3,
  Award,
  Bell,
  Layers
} from 'lucide-react';

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Lock mobile body scroll when drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Fetch unread notifications count
  useEffect(() => {
    let interval = null;

    const fetchUnread = async () => {
      try {
        const res = await API.get('/notifications/unread-count');
        if (res.data?.success) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch {
        // silent
      }
    };

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(fetchUnread, 45000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchUnread();
        startPolling();
      }
    };

    fetchUnread();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const currentUser = user || JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'student';
  const canManageTeachers = role === 'superadmin' || role === 'admin';
  const canManageExams = ['superadmin', 'admin', 'teacher'].includes(role);
  const canApproveExams = ['superadmin', 'admin'].includes(role);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const isCurrentPath = (path) => {
    if (path === '/exams' && location.pathname === '/exams') return true;
    if (location.pathname === path) return true;
    if (
      path !== '/dashboard' &&
      path !== '/exams' &&
      path !== '/teachers' &&
      path !== '/students' &&
      location.pathname.startsWith(path)
    ) return true;
    return false;
  };

  const styles = {
    sidebarContainer: {
      width: '260px',
      minWidth: '260px',
      maxWidth: '260px',
      backgroundColor: '#0b1329',
      color: '#fff',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1040,
      borderRight: '1px solid #1e293b',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden', // Prevents any container spill
    },
    navSectionTitle: {
      fontSize: '0.68rem',
      fontWeight: '700',
      letterSpacing: '0.8px',
      color: '#64748b',
      textTransform: 'uppercase',
      padding: '14px 10px 4px 10px',
      width: '100%',
      boxSizing: 'border-box',
    },
    navLink: (active) => ({
      color: active ? '#ffffff' : '#94a3b8',
      backgroundColor: active ? '#2563eb' : 'transparent',
      fontWeight: active ? '600' : '500',
      borderRadius: '8px',
      padding: '9px 12px',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box',
      textDecoration: 'none',
      fontSize: '0.85rem',
      marginBottom: '3px',
      flexShrink: 0,
      transition: 'all 0.15s ease',
    }),
    badgeCount: {
      fontSize: '0.65rem',
      padding: '2px 7px',
      borderRadius: '8px',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      marginLeft: 'auto',
      fontWeight: '700',
    },
    badgeLive: {
      fontSize: '0.62rem',
      padding: '2px 6px',
      borderRadius: '8px',
      backgroundColor: '#1e293b',
      color: '#38bdf8',
      border: '1px solid #334155',
      marginLeft: 'auto',
      fontWeight: '600',
    }
  };

  return (
    <>
      <style>{`
        /* Stop horizontal scrolling globally */
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }

        /* Desktop View: Strictly fixed to left */
        @media (min-width: 992px) {
          .neo-sidebar {
            transform: translateX(0) !important;
            visibility: visible !important;
          }
          .neo-mobile-bar,
          .neo-backdrop {
            display: none !important;
          }
        }

        /* Mobile View (<992px): Slide-in Drawer */
        @media (max-width: 991.98px) {
          .neo-sidebar {
            width: 270px !important;
            max-width: 85vw !important;
            z-index: 1060 !important;
            transform: ${isMobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
            visibility: ${isMobileOpen ? 'visible' : 'hidden'};
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s ease;
            box-shadow: ${isMobileOpen ? '8px 0 25px rgba(0,0,0,0.6)' : 'none'};
          }
          .neo-mobile-bar {
            display: flex !important;
          }
        }

        /* Nav link hover */
        .sidebar-item-link:hover {
          color: #ffffff !important;
          background-color: rgba(255, 255, 255, 0.06) !important;
        }

        /* Clean slim scrollbar without horizontal bar */
        .sidebar-scroll-zone {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
        .sidebar-scroll-zone::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll-zone::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 4px;
        }

        /* Animated hamburger bars */
        .hamb-line {
          width: 20px;
          height: 2px;
          background: #fff;
          border-radius: 2px;
          transition: all 0.25s ease;
        }
      `}</style>

      {/* ================= MOBILE TOP BAR ================= */}
      <div
        className="neo-mobile-bar fixed-top align-items-center justify-content-between px-3"
        style={{
          backgroundColor: '#0b1329',
          height: '58px',
          borderBottom: '1px solid #1e293b',
          zIndex: 1040,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, backgroundColor: '#2563eb' }}
          >
            <BookOpen className="text-white" size={18} />
          </div>
          <div>
            <span className="fw-bold text-white fs-6 d-block lh-1">NEO SCHOOL</span>
            <span className="text-muted text-uppercase" style={{ fontSize: '8px', letterSpacing: '0.8px' }}>
              Exam ERP
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link
            to="/notifications"
            className="btn btn-sm text-light position-relative p-2 rounded-circle"
            style={{ backgroundColor: '#1e293b' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="btn btn-primary d-flex flex-column justify-content-center align-items-center gap-1 p-2 rounded-3 border-0"
            style={{ backgroundColor: '#2563eb', width: '38px', height: '38px' }}
          >
            <span
              className="hamb-line"
              style={isMobileOpen ? { transform: 'translateY(6px) rotate(45deg)' } : {}}
            />
            <span
              className="hamb-line"
              style={isMobileOpen ? { opacity: 0 } : {}}
            />
            <span
              className="hamb-line"
              style={isMobileOpen ? { transform: 'translateY(-6px) rotate(-45deg)' } : {}}
            />
          </button>
        </div>
      </div>

      {/* Mobile Dark Backdrop */}
      {isMobileOpen && (
        <div
          className="neo-backdrop position-fixed top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: 'rgba(11, 19, 41, 0.75)',
            zIndex: 1050,
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR COMPONENT ================= */}
      <aside className="neo-sidebar p-3" style={styles.sidebarContainer}>
        
        {/* Brand Header */}
        <div className="d-flex align-items-center px-1 mb-2 mt-1">
          <div
            className="rounded-3 me-2 d-flex align-items-center justify-content-center shadow-sm"
            style={{ width: 36, height: 36, backgroundColor: '#2563eb', flexShrink: 0 }}
          >
            <BookOpen className="text-white" size={20} />
          </div>
          <div className="overflow-hidden">
            <span className="fs-6 fw-bold text-white d-block lh-1 text-truncate" style={{ letterSpacing: '-0.3px' }}>
              NEO SCHOOL
            </span>
            <span className="text-muted text-uppercase d-block" style={{ fontSize: '8.5px', letterSpacing: '0.8px' }}>
              Online Exam ERP
            </span>
          </div>
        </div>

        <hr className="text-secondary opacity-25 my-2" />

        {/* Navigation Items (Single column strictly - no wrap or spill) */}
        <div
          className="sidebar-scrollZone sidebar-scroll-zone d-flex flex-column flex-nowrap w-100 pe-1"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* SECTION 1: MAIN */}
          <div style={styles.navSectionTitle}>MAIN</div>

          <Link
            to="/dashboard"
            className="sidebar-item-link"
            style={styles.navLink(isCurrentPath('/dashboard'))}
            onClick={() => setIsMobileOpen(false)}
          >
            <Calendar className="me-2 text-primary-subtle flex-shrink-0" size={16} />
            <span className="text-truncate">Dashboard</span>
          </Link>

          <Link
            to="/notifications"
            className="sidebar-item-link"
            style={styles.navLink(isCurrentPath('/notifications'))}
            onClick={() => setIsMobileOpen(false)}
          >
            <Bell className="me-2 text-warning-emphasis flex-shrink-0" size={16} />
            <span className="text-truncate">Notifications</span>
            {unreadCount > 0 && (
              <span style={styles.badgeCount}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* SECTION 2: EXAMINATIONS */}
          <div style={styles.navSectionTitle}>EXAMINATIONS</div>

          <Link
            to="/exams"
            className="sidebar-item-link"
            style={styles.navLink(isCurrentPath('/exams'))}
            onClick={() => setIsMobileOpen(false)}
          >
            <FileCheck2 className="me-2 text-primary flex-shrink-0" size={16} />
            <span className="text-truncate">{role === 'student' ? 'My Examinations' : 'Examinations Hub'}</span>
          </Link>

          {/* Dedicated Live Exams Section (Phase 4) */}
          <Link
            to="/exams/live"
            className="sidebar-item-link"
            style={styles.navLink(isCurrentPath('/exams/live'))}
            onClick={() => setIsMobileOpen(false)}
          >
            <Calendar className="me-2 text-danger flex-shrink-0" size={16} />
            <span className="text-truncate">Live Exams</span>
            <span style={styles.badgeLive}>LIVE</span>
          </Link>

          {canManageExams && (
            <Link
              to="/exams/create"
              className="sidebar-item-link"
              style={styles.navLink(isCurrentPath('/exams/create'))}
              onClick={() => setIsMobileOpen(false)}
            >
              <PlusCircle className="me-2 text-success flex-shrink-0" size={16} />
              <span className="text-truncate">Create Examination</span>
            </Link>
          )}

          {canManageExams && (
            <Link
              to="/question-papers"
              className="sidebar-item-link"
              style={styles.navLink(isCurrentPath('/question-papers'))}
              onClick={() => setIsMobileOpen(false)}
            >
              <BookOpen className="me-2 text-indigo-400 flex-shrink-0" size={16} />
              <span className="text-truncate">Question Papers</span>
            </Link>
          )}

          {canManageExams && (
            <Link
              to="/exam-patterns"
              className="sidebar-item-link"
              style={styles.navLink(isCurrentPath('/exam-patterns'))}
              onClick={() => setIsMobileOpen(false)}
            >
              <Layers className="me-2 text-primary flex-shrink-0" size={16} />
              <span className="text-truncate">Exam Patterns</span>
            </Link>
          )}

          {canManageExams && (
            <Link
              to="/question-bank"
              className="sidebar-item-link"
              style={styles.navLink(isCurrentPath('/question-bank'))}
              onClick={() => setIsMobileOpen(false)}
            >
              <Database className="me-2 text-warning flex-shrink-0" size={16} />
              <span className="text-truncate">Question Bank</span>
            </Link>
          )}

          {canApproveExams && (
            <Link
              to="/exams/approvals"
              className="sidebar-item-link"
              style={styles.navLink(isCurrentPath('/exams/approvals'))}
              onClick={() => setIsMobileOpen(false)}
            >
              <CheckSquare className="me-2 text-info flex-shrink-0" size={16} />
              <span className="text-truncate">Paper Approvals</span>
            </Link>
          )}

          {canManageExams && (
            <Link
              to="/exams/evaluations"
              className="sidebar-item-link"
              style={styles.navLink(isCurrentPath('/exams/evaluations'))}
              onClick={() => setIsMobileOpen(false)}
            >
              <FileText className="me-2 text-emerald-400 flex-shrink-0" size={16} />
              <span className="text-truncate">Descriptive Evaluation</span>
            </Link>
          )}

          <Link
            to={role === 'student' ? '/reports/my-report' : '/exams/results'}
            className="sidebar-item-link"
            style={styles.navLink(isCurrentPath(role === 'student' ? '/reports/my-report' : '/exams/results'))}
            onClick={() => setIsMobileOpen(false)}
          >
            {role === 'student' ? (
              <>
                <Award className="me-2 text-warning flex-shrink-0" size={16} />
                <span className="text-truncate">My Academic Report</span>
              </>
            ) : (
              <>
                <BarChart3 className="me-2 text-indigo-400 flex-shrink-0" size={16} />
                <span className="text-truncate">Results & Analytics</span>
              </>
            )}
          </Link>

          {/* SECTION 3: FACULTY & STUDENTS (Hidden for Students) */}
          {role !== 'student' && (
            <>
              <div style={styles.navSectionTitle}>FACULTY & STUDENTS</div>

              <Link
                to="/teachers"
                className="sidebar-item-link"
                style={styles.navLink(isCurrentPath('/teachers'))}
                onClick={() => setIsMobileOpen(false)}
              >
                <Users className="me-2 text-info flex-shrink-0" size={16} />
                <span className="text-truncate">Teachers Directory</span>
              </Link>

              {canManageTeachers && (
                <Link
                  to="/teachers/add"
                  className="sidebar-item-link"
                  style={styles.navLink(isCurrentPath('/teachers/add'))}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <UserPlus className="me-2 text-success flex-shrink-0" size={16} />
                  <span className="text-truncate">Add New Teacher</span>
                </Link>
              )}

              <Link
                to="/students"
                className="sidebar-item-link"
                style={styles.navLink(isCurrentPath('/students'))}
                onClick={() => setIsMobileOpen(false)}
              >
                <GraduationCap className="me-2 text-warning flex-shrink-0" size={16} />
                <span className="text-truncate">Students Directory</span>
              </Link>

              {canManageExams && (
                <Link
                  to="/students/add"
                  className="sidebar-item-link"
                  style={styles.navLink(isCurrentPath('/students/add'))}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <UserPlus className="me-2 text-amber-400 flex-shrink-0" size={16} />
                  <span className="text-truncate">Enroll Student</span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* User Card & Logout Bottom */}
        <div className="pt-2 mt-auto border-top border-secondary border-opacity-25 w-100">
          <div
            className="d-flex align-items-center justify-content-between p-2 rounded-3 w-100"
            style={{ backgroundColor: '#131e38', boxSizing: 'border-box' }}
          >
            <div className="d-flex align-items-center overflow-hidden" style={{ minWidth: 0 }}>
              {currentUser?.profilePhoto && !currentUser.profilePhoto.includes('avatar.png') ? (
                <img
                  src={currentUser.profilePhoto}
                  alt="Profile"
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6', flexShrink: 0 }}
                  className="me-2"
                />
              ) : (
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold me-2 flex-shrink-0"
                  style={{ width: 34, height: 34, fontSize: '0.8rem' }}
                >
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <div className="overflow-hidden" style={{ minWidth: 0 }}>
                <div
                  className="text-white small fw-bold text-truncate"
                  title={currentUser?.name || 'Administrator'}
                  style={{ fontSize: '0.8rem' }}
                >
                  {currentUser?.name || 'Administrator'}
                </div>
                <div
                  className="badge bg-primary-subtle text-primary text-uppercase px-1 py-0 text-truncate"
                  style={{ fontSize: '8px' }}
                >
                  {currentUser?.role || 'Admin'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-sm text-danger p-1 border-0 rounded-2 ms-1 flex-shrink-0"
              title="Log Out"
              style={{ backgroundColor: '#1e293b' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
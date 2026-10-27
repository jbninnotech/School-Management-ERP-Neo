import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  Award
} from 'lucide-react';

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve current user from props or session storage.
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
    sidebar: {
      width: '260px',
      backgroundColor: '#0f172a',
      color: '#fff',
      minHeight: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      borderRight: '1px solid #1e293b',
    },
    navSectionTitle: {
      fontSize: '0.68rem',
      fontWeight: '700',
      letterSpacing: '0.8px',
      color: '#64748b',
      textTransform: 'uppercase',
      padding: '12px 14px 4px',
    },
    navLink: (active) => ({
      color: active ? '#ffffff' : '#94a3b8',
      backgroundColor: active ? '#2563eb' : 'transparent',
      fontWeight: active ? '600' : '500',
      borderRadius: '8px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      marginBottom: '3px',
      textDecoration: 'none',
      transition: 'all 0.15s ease',
      fontSize: '0.85rem',
    }),
    badgeNew: {
      fontSize: '0.62rem',
      padding: '2px 6px',
      borderRadius: '10px',
      backgroundColor: '#1e293b',
      color: '#38bdf8',
      border: '1px solid #334155',
      marginLeft: 'auto',
      fontWeight: '600',
    },
    badgeCount: (bg, color) => ({
      fontSize: '0.65rem',
      padding: '2px 6px',
      borderRadius: '8px',
      backgroundColor: bg,
      color: color,
      marginLeft: 'auto',
      fontWeight: '700',
    }),
    userAvatar: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      objectFit: 'cover',
      border: '2px solid #3b82f6',
    }
  };

  return (
    <aside style={styles.sidebar} className="app-sidebar d-flex flex-column p-3">
      
      {/* Brand Header */}
      <div className="d-flex align-items-center mb-3 px-2 mt-2">
        <div 
          className="rounded-3 me-2 d-flex align-items-center justify-content-center shadow-sm" 
          style={{ width: 40, height: 40, backgroundColor: '#2563eb' }}
        >
          <BookOpen className="text-white" size={22} />
        </div>
        <div>
          <span className="fs-5 fw-bold text-white d-block lh-1" style={{ letterSpacing: '-0.5px' }}>
            NEO SCHOOL
          </span>
          <span className="text-muted text-uppercase" style={{ fontSize: '9px', letterSpacing: '1px' }}>
            Online Exam ERP
          </span>
        </div>
      </div>

      <hr className="text-secondary opacity-25 my-1" />

      {/* Navigation Groups */}
      <nav className="nav flex-column mb-auto mt-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 170px)' }}>
        
        {/* SECTION 1: MAIN */}
        <div style={styles.navSectionTitle}>Main</div>
        
        <Link to="/dashboard" style={styles.navLink(isCurrentPath('/dashboard'))}>
          <Calendar className="me-2 text-primary-subtle" size={16} /> 
          <span>Dashboard</span>
        </Link>

        {/* SECTION 2: EXAMINATIONS ENGINE (Core Module) */}
        <div style={styles.navSectionTitle}>Examinations</div>

        {/* Exam Portal Hub */}
        <Link to="/exams" style={styles.navLink(isCurrentPath('/exams'))}>
          <FileCheck2 className="me-2 text-primary" size={16} /> 
          <span>{role === 'student' ? 'My Examinations' : 'Examinations Hub'}</span>
          {role === 'student' && <span style={styles.badgeNew}>LIVE</span>}
        </Link>

        {/* Question Paper Builder / Wizard (Teachers, Admin, SuperAdmin) */}
        {canManageExams && (
          <Link to="/exams/create" style={styles.navLink(isCurrentPath('/exams/create'))}>
            <PlusCircle className="me-2 text-success" size={16} /> 
            <span>Create Examination</span>
          </Link>
        )}

        {/* Question Bank (Teachers, Admin, SuperAdmin) */}
        {canManageExams && (
          <Link to="/question-bank" style={styles.navLink(isCurrentPath('/question-bank'))}>
            <Database className="me-2 text-warning" size={16} /> 
            <span>Question Bank</span>
          </Link>
        )}

        {/* Paper Approvals (Principal & SuperAdmin) */}
        {canApproveExams && (
          <Link to="/exams/approvals" style={styles.navLink(isCurrentPath('/exams/approvals'))}>
            <CheckSquare className="me-2 text-info" size={16} /> 
            <span>Paper Approvals</span>
          </Link>
        )}

        {/* Evaluation Hub (Teachers & Admin) */}
        {canManageExams && (
          <Link to="/exams/evaluations" style={styles.navLink(isCurrentPath('/exams/evaluations'))}>
            <FileText className="me-2 text-emerald-400" size={16} /> 
            <span>Descriptive Evaluation</span>
          </Link>
        )}

        {/* Results & Performance Analytics */}
        <Link to="/exams/results" style={styles.navLink(isCurrentPath('/exams/results'))}>
          {role === 'student' ? (
            <>
              <Award className="me-2 text-warning" size={16} /> 
              <span>My Report Card</span>
            </>
          ) : (
            <>
              <BarChart3 className="me-2 text-indigo-400" size={16} /> 
              <span>Results & Analytics</span>
            </>
          )}
        </Link>

        {/* SECTION 3: ACADEMICS / USERS */}
        <div style={styles.navSectionTitle}>Faculty & Students</div>
        
        {/* Teachers Directory */}
        <Link to="/teachers" style={styles.navLink(isCurrentPath('/teachers'))}>
          <Users className="me-2 text-info" size={16} /> 
          <span>Teachers Directory</span>
        </Link>

        {/* Add Teacher (Only SuperAdmin & Principal) */}
        {canManageTeachers && (
          <Link to="/teachers/add" style={styles.navLink(isCurrentPath('/teachers/add'))}>
            <UserPlus className="me-2 text-success" size={16} /> 
            <span>Add New Teacher</span>
          </Link>
        )}

        {/* Students Directory */}
        <Link to="/students" style={styles.navLink(isCurrentPath('/students'))}>
          <GraduationCap className="me-2 text-warning" size={16} /> 
          <span>Students Directory</span>
        </Link>

        {/* Add Student */}
        {canManageExams && (
          <Link to="/students/add" style={styles.navLink(isCurrentPath('/students/add'))}>
            <UserPlus className="me-2 text-amber-400" size={16} /> 
            <span>Enroll Student</span>
          </Link>
        )}
      </nav>

      {/* User Profile & Logout Bottom Card */}
      <div className="mt-auto pt-2 border-top border-secondary border-opacity-25">
        <div className="d-flex align-items-center justify-content-between p-1 rounded-2" style={{ backgroundColor: '#1e293b' }}>
          
          <div className="d-flex align-items-center overflow-hidden ps-1">
            {currentUser?.profilePhoto && !currentUser.profilePhoto.includes('avatar.png') ? (
              <img 
                src={currentUser.profilePhoto} 
                alt="Profile" 
                style={styles.userAvatar} 
                className="me-2 flex-shrink-0"
              />
            ) : (
              <div 
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold me-2 flex-shrink-0" 
                style={{ width: 34, height: 34, fontSize: '0.82rem' }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <div className="text-truncate" style={{ maxWidth: '125px' }}>
              <div className="text-white small fw-bold text-truncate" title={currentUser?.name}>
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="badge bg-primary-subtle text-primary text-uppercase px-1 py-0" style={{ fontSize: '8.5px' }}>
                {currentUser?.role || 'Admin'}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            className="btn btn-sm text-danger p-1 border-0" 
            title="Log Out of System"
            style={{ cursor: 'pointer' }}
          >
            <LogOut size={16} />
          </button>

        </div>
      </div>

    </aside>
  );
}

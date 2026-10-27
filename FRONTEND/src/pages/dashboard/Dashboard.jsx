import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  PlusCircle,
  Users,
} from 'lucide-react';
import API from '../../api/api.js';
import Sidebar from '../../components/Sidebar.jsx';

const roleTitles = {
  superadmin: 'Super Admin Dashboard',
  admin: 'Admin Dashboard',
  teacher: 'Teacher Dashboard',
  student: 'Student Dashboard',
};

const roleActions = {
  teacher: [
    { title: 'Create Examination', description: 'Build and schedule an exam.', href: '/exams/create', icon: PlusCircle },
    { title: 'Question Bank', description: 'Review and manage questions.', href: '/question-bank', icon: BookOpen },
    { title: 'Evaluate Answers', description: 'Review submitted descriptive answers.', href: '/exams/evaluations', icon: ClipboardCheck },
    { title: 'Results & Analytics', description: 'Review examination performance.', href: '/exams/results', icon: BarChart3 },
  ],
  student: [
    { title: 'My Examinations', description: 'View available and scheduled exams.', href: '/exams', icon: BookOpen },
    { title: 'My Report Card', description: 'View published examination results.', href: '/exams/results', icon: GraduationCap },
  ],
};

export default function Dashboard() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || 'student';
  const isAdmin = ['superadmin', 'admin'].includes(role);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
  });
  const [loading, setLoading] = useState(isAdmin);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      try {
        const res = await API.get('/dashboard/admin');
        if (!res.data?.success || !res.data?.data?.summaryCards) {
          throw new Error('Dashboard metrics are unavailable.');
        }
        setStats((current) => ({ ...current, ...res.data.data.summaryCards }));
      } catch (error) {
        console.error('Unable to load dashboard metrics.', error);
        setStatsError('Unable to load live institution metrics. Please refresh or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  const styles = {
    layout: {
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Roboto, sans-serif",
    },
    main: {
      marginLeft: '260px',
      padding: '28px 36px',
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: 'none',
      boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
    },
  };

  const actions = roleActions[role] || [];

  return (
    <div style={styles.layout}>
      <Sidebar user={user} />
      <main style={styles.main}>
        <header className="mb-4 bg-white p-4 rounded-4 shadow-sm">
          <span className="text-primary small fw-semibold text-uppercase">School ERP</span>
          <h1 className="h3 fw-bold mb-1 text-dark">{roleTitles[role] || 'Dashboard'}</h1>
          <p className="text-muted mb-0">
            Welcome{user.name ? `, ${user.name}` : ''}. Your dashboard is tailored to your account.
          </p>
        </header>

        {isAdmin ? (
          <section aria-labelledby="institution-overview">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 id="institution-overview" className="h5 fw-semibold text-secondary mb-0">
                Institution Overview
              </h2>
              <Link to="/students/add" className="btn btn-primary btn-sm rounded-3 d-flex align-items-center gap-2">
                <PlusCircle size={15} /> Enroll Student
              </Link>
            </div>

            {statsError && <div className="alert alert-danger" role="alert">{statsError}</div>}

            <div className="row g-4 mb-4">
              <MetricCard title="Students" value={stats.totalStudents} loading={loading} icon={GraduationCap} />
              <MetricCard title="Teachers" value={stats.totalTeachers} loading={loading} icon={Users} />
              <MetricCard title="Administrators" value={stats.totalAdmins} loading={loading} icon={ClipboardCheck} />
            </div>

            <div className="row g-4">
              <DashboardLink title="Manage Students" description="Browse student records and enrollments." href="/students" icon={GraduationCap} />
              <DashboardLink title="Manage Teachers" description="Browse faculty and staff accounts." href="/teachers" icon={Users} />
              <DashboardLink title="Examinations" description="Manage exams, approvals, and results." href="/exams" icon={BookOpen} />
            </div>
          </section>
        ) : (
          <section aria-labelledby="role-workspace">
            <h2 id="role-workspace" className="h5 fw-semibold text-secondary mb-3">
              {role === 'teacher' ? 'Teaching Workspace' : 'Student Workspace'}
            </h2>
            <div className="row g-4">
              {actions.map(({ title, description, href, icon: Icon }) => (
                <div className="col-12 col-md-6" key={href}>
                  <Link to={href} className="text-decoration-none text-reset">
                    <div className="card h-100 p-4" style={styles.card}>
                      <div className="d-flex align-items-start gap-3">
                        <div className="rounded-3 bg-primary-subtle text-primary p-3">
                          <Icon size={22} />
                        </div>
                        <div>
                          <h3 className="h6 fw-bold mb-1">{title}</h3>
                          <p className="text-muted small mb-0">{description}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricCard({ title, value, loading, icon: Icon }) {
  return (
    <div className="col-12 col-sm-6 col-xl-4">
      <div className="card p-3 h-100 border-0 shadow-sm rounded-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <span className="text-muted small text-uppercase fw-semibold">{title}</span>
            <p className="h3 fw-bold text-dark my-1">{loading ? '...' : value}</p>
          </div>
          <div className="rounded-3 bg-primary-subtle text-primary p-3">
            <Icon size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardLink({ title, description, href, icon: Icon }) {
  return (
    <div className="col-12 col-lg-4">
      <Link to={href} className="text-decoration-none text-reset">
        <div className="card h-100 p-4 border-0 shadow-sm rounded-4">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 bg-primary-subtle text-primary p-3">
              <Icon size={22} />
            </div>
            <div>
              <h3 className="h6 fw-bold mb-1">{title}</h3>
              <p className="text-muted small mb-0">{description}</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

import React, { useState } from 'react';

// Read API Base URL from .env (supports both Vite and Create React App)
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:5000/api/v1';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errorMsg) setErrorMsg(''); // Clear error on typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      // Store authentication data
      sessionStorage.setItem('token', data.token || data.accessToken);
      sessionStorage.setItem('user', JSON.stringify(data.user || data.data));

      setSuccessMsg('Authentication successful! Redirecting...');

      // Redirect based on role or to dashboard after 1 second
      setTimeout(() => {
        const userRole = data.user?.role || data.role;
        if (userRole === 'superadmin') {
          window.location.href = '/superadmin/dashboard';
        } else if (userRole === 'admin') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1000);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">
            <div className="card border-0" style={styles.card}>
              <div className="card-body p-4 p-sm-5">
                
                {/* Branding / Header */}
                <div className="text-center mb-4">
                  <div style={styles.logoBadge}>
                    <i className="bi bi-mortarboard-fill" style={{ fontSize: '1.8rem', color: '#1a365d' }}></i>
                  </div>
                  <h3 className="fw-bold mt-3 mb-1" style={{ color: '#0f172a', letterSpacing: '-0.5px' }}>
                    School ERP Portal
                  </h3>
                  <p className="text-muted small">
                    Sign in with your authorized institutional account
                  </p>
                </div>

                {/* Alerts */}
                {errorMsg && (
                  <div className="alert alert-danger py-2 px-3 small border-0 d-flex align-items-center" role="alert" style={styles.alertDanger}>
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>{errorMsg}</div>
                  </div>
                )}

                {successMsg && (
                  <div className="alert alert-success py-2 px-3 small border-0 d-flex align-items-center" role="alert" style={styles.alertSuccess}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <div>{successMsg}</div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">
                      Official Email Address
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0" style={styles.inputGroupIcon}>
                        <i className="bi bi-envelope text-muted"></i>
                      </span>
                      <input
                        type="email"
                        name="email"
                        className="form-control bg-light border-start-0"
                        style={styles.inputField}
                        placeholder="e.g., superadmin@neo.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <label className="form-label small fw-semibold text-secondary">
                        Password
                      </label>
                      <a href="#forgot" style={styles.forgotLink} tabIndex="-1">
                        Forgot password?
                      </a>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0" style={styles.inputGroupIcon}>
                        <i className="bi bi-lock text-muted"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="form-control bg-light border-start-0 border-end-0"
                        style={styles.inputField}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="input-group-text bg-light border-start-0 text-muted"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 small text-muted">
                    Your sign-in session ends when this browser tab is closed.
                  </div>

                  <button
                    type="submit"
                    className="btn w-100 py-2 fw-semibold"
                    style={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Authenticating...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                {/* Demo Helper Pill Box */}
                <div className="mt-4 p-3 rounded" style={styles.helperBox}>
                  <p className="fw-semibold small text-dark mb-1">
                    <i className="bi bi-info-circle me-1 text-primary"></i> Seeded Demo Credentials:
                  </p>
                  <div className="small text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                    <strong>Super Admin:</strong> <code>superadmin@neo.com</code> | <code>SuperAdmin@2026</code><br />
                    <strong>Principal:</strong> <code>principal@neo.com</code> | <code>Principal@2026</code>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-muted small mt-4">
              &copy; {new Date().getFullYear()} School ERP. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Professional CSS-in-JS Styles
const styles = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    padding: '2rem 1rem',
  },
  card: {
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
    backgroundColor: '#ffffff',
  },
  logoBadge: {
    width: '64px',
    height: '64px',
    margin: '0 auto',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #dbeafe',
  },
  inputGroupIcon: {
    borderColor: '#cbd5e1',
    borderRadius: '8px 0 0 8px',
  },
  inputField: {
    fontSize: '0.95rem',
    borderColor: '#cbd5e1',
    color: '#1e293b',
    boxShadow: 'none',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    border: 'none',
  },
  forgotLink: {
    fontSize: '0.8rem',
    color: '#2563eb',
    textDecoration: 'none',
  },
  helperBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  alertDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
  },
  alertSuccess: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
  },
};

export default Login;
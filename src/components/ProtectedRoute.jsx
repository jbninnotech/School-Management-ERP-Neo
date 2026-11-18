import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  // 1. Not logged in -> Redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Role-restricted route check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user's role is not authorized, send back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Authorized -> Render the page
  return children;
};

export default ProtectedRoute;
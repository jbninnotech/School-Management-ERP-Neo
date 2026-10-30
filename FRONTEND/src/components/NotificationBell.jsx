import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api.js';
import {
  Bell,
  Calendar,
  Clock,
  Award,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';

export default function NotificationBell({ onSelectExam }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications?limit=8');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for notifications every 15 seconds so new exam schedules appear live
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // fallback
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await API.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }
    setIsOpen(false);

    if (onSelectExam && notif.examination) {
      onSelectExam(notif.examination);
    } else if (notif.examination) {
      navigate('/exams');
    } else {
      navigate('/notifications');
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'exam_scheduled':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">Scheduled</span>;
      case 'exam_rescheduled':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Rescheduled</span>;
      case 'exam_cancelled':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Cancelled</span>;
      case 'results_published':
        return <span className="badge bg-success-subtle text-success border border-success-subtle">Results Out</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary">Exam</span>;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="position-relative d-inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className="btn btn-light rounded-circle p-2 position-relative border shadow-sm d-flex align-items-center justify-content-center"
        style={{ width: '42px', height: '42px', transition: 'all 0.2s' }}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Examination Notifications"
        aria-label="Examination Notifications"
      >
        <Bell size={19} className={unreadCount > 0 ? 'text-primary' : 'text-secondary'} />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm"
            style={{ fontSize: '0.68rem', padding: '0.35em 0.55em' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="visually-hidden">unread notifications</span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="card border-0 shadow-lg rounded-4 position-absolute end-0 mt-2 bg-white"
          style={{
            width: '380px',
            maxWidth: '92vw',
            zIndex: 1050,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Header */}
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-dark fs-6">Notifications</span>
              {unreadCount > 0 && (
                <span className="badge bg-primary rounded-pill small">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none p-0 text-primary small d-flex align-items-center gap-1"
                onClick={handleMarkAllAsRead}
                disabled={loading}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <Bell size={28} className="text-secondary opacity-50 mb-2 d-block mx-auto" />
                <p className="small mb-0">No notifications yet</p>
                <span className="small text-muted" style={{ fontSize: '11px' }}>
                  You will be notified when examinations are scheduled or results released.
                </span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 border-bottom text-decoration-none d-block position-relative ${
                    !notif.isRead ? 'bg-primary-subtle bg-opacity-10' : 'bg-white'
                  }`}
                  style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = !notif.isRead
                      ? 'rgba(13, 110, 253, 0.05)'
                      : '#ffffff')
                  }
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div className="d-flex align-items-center gap-1">
                      {getTypeBadge(notif.type)}
                      {!notif.isRead && (
                        <span
                          className="bg-primary rounded-circle d-inline-block ms-1"
                          style={{ width: '7px', height: '7px' }}
                          title="Unread"
                        />
                      )}
                    </div>
                    <span className="text-muted small" style={{ fontSize: '11px' }}>
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <h6 className="fw-semibold text-dark mb-1 small">{notif.title}</h6>
                  <p className="text-muted small mb-2 lh-sm" style={{ fontSize: '12px' }}>
                    {notif.message}
                  </p>

                  {/* Exam metadata pills */}
                  {notif.examMetadata && (
                    <div className="d-flex flex-wrap gap-2 text-muted small" style={{ fontSize: '11px' }}>
                      {notif.examMetadata.examDate && (
                        <span className="d-flex align-items-center gap-1">
                          <Calendar size={12} className="text-primary" />
                          {new Date(notif.examMetadata.examDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                      {notif.examMetadata.durationMinutes && (
                        <span className="d-flex align-items-center gap-1">
                          <Clock size={12} className="text-secondary" />
                          {notif.examMetadata.durationMinutes}m
                        </span>
                      )}
                      {notif.examMetadata.totalMarks && (
                        <span className="d-flex align-items-center gap-1">
                          <Award size={12} className="text-warning" />
                          {notif.examMetadata.totalMarks} Marks
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="card-footer bg-light p-2 text-center border-top">
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-primary fw-semibold small w-100"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
            >
              View All Notifications <ArrowRight size={13} className="ms-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

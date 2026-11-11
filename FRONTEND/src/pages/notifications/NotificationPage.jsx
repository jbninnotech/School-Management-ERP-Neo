import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar.jsx";
import API from "../../api/api.js";

import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  ArrowRight,
  BellRing,
  MailOpen,
  CalendarClock,
  Trophy,
  Filter,
  Search,
  BookOpen,
  RefreshCw,
  Eye,
  Sparkles,
  Inbox,
  XCircle,
  FileText,
} from "lucide-react";

export default function NotificationPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all'|'read | 'unread' | 'scheduled' | 'results' | 'cancelled'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamDetails, setSelectedExamDetails] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await API.get("/notifications?limit=100");
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(
        (prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        // console.log("Types from API:", [...new Set((res.data.data || []).map(n => n.type))])
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };
  const normalizeType = (t = "") =>
    t
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

  const TYPE_GROUPS = {
    scheduled: [
      "exam_scheduled",
      "exam_rescheduled",
      "scheduled",
      "rescheduled",
    ],
    results: [
      "results_published",
      "result_published",
      "results_released",
      "result_released",
    ],
    cancelled: ["exam_cancelled", "exam_canceled", "cancelled", "canceled"],
  };

  const isType = (n, group) =>
    TYPE_GROUPS[group].includes(normalizeType(n.type));

  const readCount = notifications.length - unreadCount;
  const scheduledCount = notifications.filter((n) => isType(n, "scheduled"))
    .length;
  const resultsCount = notifications.filter((n) => isType(n, "results")).length;
  const cancelledCount = notifications.filter((n) => isType(n, "cancelled"))
    .length;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === "read" && !notif.isRead) return false;
    if (activeFilter === "unread" && notif.isRead) return false;
    if (activeFilter === "scheduled" && !isType(notif, "scheduled"))
      return false;
    if (activeFilter === "results" && !isType(notif, "results")) return false;
    if (activeFilter === "cancelled" && !isType(notif, "cancelled"))
      return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        notif.title?.toLowerCase().includes(term) ||
        notif.message?.toLowerCase().includes(term) ||
        notif.examMetadata?.subject?.toLowerCase().includes(term) ||
        notif.examMetadata?.classGrade?.toLowerCase().includes(term)
      );
    }
    return true;
  });
  const emptyMessages = {
    all: "You have no examination notifications yet.",
    unread: "You're all caught up! There are no unread notices.",
    read: "You haven't read any notifications yet.",
    scheduled: "No exam schedule notices have been issued.",
    results: "No results have been released yet.",
    cancelled: "No exams have been cancelled.",
  };

  const getTypeBadge = (type) => {
    switch (normalizeType(type)) {
      case "exam_scheduled":
        return (
          <span
            className="badge px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              fontSize: "0.72rem",
            }}
          >
            <Calendar size={11} /> Scheduled
          </span>
        );
      case "exam_rescheduled":
        return (
          <span
            className="badge px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: "#fffbeb",
              color: "#b45309",
              border: "1px solid #fde68a",
              fontSize: "0.72rem",
            }}
          >
            <Clock size={11} /> Updated Schedule
          </span>
        );
      case "exam_cancelled":
        return (
          <span
            className="badge px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              fontSize: "0.72rem",
            }}
          >
            <XCircle size={11} /> Cancelled
          </span>
        );
      case "results_published":
        return (
          <span
            className="badge px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0",
              fontSize: "0.72rem",
            }}
          >
            <Award size={11} /> Results Released
          </span>
        );
      default:
        return (
          <span
            className="badge bg-secondary-subtle text-secondary px-2 py-1"
            style={{ fontSize: "0.72rem" }}
          >
            Notice
          </span>
        );
    }
  };

  const getBorderLeftColor = (notif) => {
    if (notif.isRead) return "#e2e8f0";
    switch (normalizeType(notif.type)) {
      case "exam_scheduled":
        return "#2563eb";
      case "exam_rescheduled":
        return "#f59e0b";
      case "exam_cancelled":
        return "#dc2626";
      case "results_published":
        return "#10b981";
      default:
        return "#3b82f6";
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Responsive Inline CSS */}
      <style>{`
        .notification-content-wrapper {
          margin-left: 260px;
          padding: 24px 32px;
          transition: margin 0.25s ease-in-out;
        }
        @media (max-width: 991.98px) {
          .notification-content-wrapper {
            margin-left: 0 !important;
            padding: 74px 14px 40px 14px !important;
          }
        }
        .notif-tabs-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .notif-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .notif-card-hover {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .notif-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>

      <Sidebar user={currentUser} />

      <main className="notification-content-wrapper">
        {/* Header Bar */}
        <div
          className="bg-white p-3 p-md-4 rounded-4 shadow-sm mb-4 border d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3"
          style={{ borderColor: "#e2e8f0" }}
        >
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "inline-flex",
                }}
              >
                <Bell size={18} />
              </span>
              <h4 className="fw-bold text-dark mb-0 fs-5 fs-md-4">
                Examination Notifications
              </h4>
            </div>
            <p className="text-secondary small mb-0">
              Official test date bulletins, room allocations, schedule
              modifications, and score publications
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 align-self-stretch align-self-md-auto">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="btn btn-light btn-sm rounded-3 border d-flex align-items-center justify-content-center gap-1 py-2 px-3 fw-semibold flex-fill flex-md-grow-0"
              style={{ minHeight: "38px", backgroundColor: "#ffffff" }}
              title={
                showFilters ? "Hide filter options" : "Show filter options"
              }
            >
              <Filter size={14} className="text-secondary" />
              <span>{showFilters ? "Hide Options" : "Show Options"}</span>
            </button>
            <button
              onClick={fetchNotifications}
              className="btn btn-light btn-sm rounded-3 border d-flex align-items-center justify-content-center gap-1 py-2 px-3 fw-semibold flex-fill flex-md-grow-0"
              style={{ minHeight: "38px", backgroundColor: "#ffffff" }}
              title="Refresh notifications"
              disabled={loading}
            >
              <RefreshCw
                size={14}
                className={loading ? "spin text-primary" : "text-secondary"}
              />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-primary btn-sm rounded-3 d-flex align-items-center justify-content-center gap-1 shadow-sm py-2 px-3 fw-semibold flex-fill flex-md-grow-0"
                style={{
                  backgroundColor: "#2563eb",
                  border: "none",
                  minHeight: "38px",
                }}
              >
                <CheckCheck size={16} />
                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs (top) */}
        {showFilters && (
          <>
            <style>{`
      .notif-box { transition: all .18s ease; cursor: pointer; }
      .notif-box:hover { transform: translateY(-3px); filter: brightness(1.03); }
    `}</style>

            <div className="row g-3 mb-3">
              {[
                {
                  key: "all",
                  label: "Total",
                  count: notifications.length,
                  Icon: Bell,
                  from: "#6d28d9",
                  to: "#8b5cf6",
                  soft: "#f5f3ff",
                },
                {
                  key: "unread",
                  label: "Unread",
                  count: unreadCount,
                  Icon: BellRing,
                  from: "#be185d",
                  to: "#ec4899",
                  soft: "#fdf2f8",
                },
                {
                  key: "read",
                  label: "Read",
                  count: readCount,
                  Icon: MailOpen,
                  from: "#475569",
                  to: "#64748b",
                  soft: "#f1f5f9",
                },
                {
                  key: "scheduled",
                  label: "Scheduled",
                  count: scheduledCount,
                  Icon: CalendarClock,
                  from: "#c2410c",
                  to: "#f97316",
                  soft: "#fff7ed",
                },
                {
                  key: "results",
                  label: "Results Released",
                  count: resultsCount,
                  Icon: Trophy,
                  from: "#a21caf",
                  to: "#d946ef",
                  soft: "#fdf4ff",
                },
                {
                  key: "cancelled",
                  label: "Cancelled",
                  count: cancelledCount,
                  Icon: XCircle,
                  from: "#b91c1c",
                  to: "#ef4444",
                  soft: "#fef2f2",
                },
              ].map((tab) => {
                const active = activeFilter === tab.key;
                return (
                  <div key={tab.key} className="col-6 col-md-4 col-xl-2">
                    <button
                      type="button"
                      onClick={() => setActiveFilter(tab.key)}
                      className="notif-box w-100 text-start rounded-4 p-3 position-relative overflow-hidden"
                      style={{
                        background: active
                          ? `linear-gradient(135deg, ${tab.from}, ${tab.to})`
                          : tab.soft,
                        color: active ? "#ffffff" : tab.from,
                        border: `1px solid ${
                          active ? tab.from : `${tab.from}40`
                        }`,
                        boxShadow: active ? `0 6px 16px ${tab.from}33` : "none",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start position-relative">
                        <div>
                          <div
                            className="fw-bold text-uppercase"
                            style={{
                              letterSpacing: "0.04em",
                              fontSize: "0.7rem",
                              opacity: 0.9,
                            }}
                          >
                            {tab.label}
                          </div>
                          <div
                            className="fw-bold lh-1 mt-2"
                            style={{ fontSize: "1.8rem" }}
                          >
                            {tab.count}
                          </div>
                        </div>

                        <div
                          className="d-flex align-items-center justify-content-center rounded-3"
                          style={{
                            width: 36,
                            height: 36,
                            background: active
                              ? "rgba(255,255,255,0.22)"
                              : "#ffffff",
                            color: active ? "#ffffff" : tab.from,
                            boxShadow: active
                              ? "none"
                              : `0 2px 6px ${tab.from}22`,
                          }}
                        >
                          <tab.Icon size={18} />
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Search Bar */}
            <div
              className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white"
              style={{ border: "1px solid #e2e8f0" }}
            >
              <div
                className="d-flex align-items-center bg-light px-3 py-2 rounded-3 border"
                style={{ minHeight: "40px" }}
              >
                <Search size={16} className="text-muted me-2 flex-shrink-0" />
                <input
                  type="text"
                  className="form-control border-0 p-0 shadow-none bg-transparent"
                  placeholder="Search notices by title, subject, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: "0.86rem" }}
                />
                {searchTerm && (
                  <button
                    className="btn btn-sm text-secondary p-0 ms-1"
                    onClick={() => setSearchTerm("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <div
              className="spinner-border text-primary mx-auto mb-3"
              role="status"
              style={{ width: "2.5rem", height: "2.5rem" }}
            />
            <p className="text-secondary small mb-0 fw-semibold">
              Syncing notification feed...
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            className="card border-0 shadow-sm rounded-4 p-4 p-md-5 text-center bg-white"
            style={{ border: "1px solid #e2e8f0" }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <Inbox size={32} />
            </div>
            <h5 className="fw-bold text-dark mb-1">No Notifications Found</h5>
            <p
              className="text-muted small mb-0 mx-auto"
              style={{ maxWidth: "400px" }}
            >
              {searchTerm
                ? `No notifications matched your search "${searchTerm}".`
                : emptyMessages[activeFilter] || emptyMessages.all}
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredNotifications.map((notif) => {
              const borderLeft = getBorderLeftColor(notif);

              return (
                <div
                  key={notif._id}
                  className="notif-card-hover rounded-4 p-3 p-md-4 bg-white border shadow-sm"
                  style={{
                    borderColor: "#e2e8f0",
                    borderLeft: `5px solid ${borderLeft}`,
                    backgroundColor: !notif.isRead ? "#ffffff" : "#fafafa",
                  }}
                >
                  {/* Top Bar inside Card */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {getTypeBadge(notif.type)}

                      {!notif.isRead && (
                        <span
                          className="badge rounded-pill fw-bold"
                          style={{
                            backgroundColor: "#ef4444",
                            color: "#ffffff",
                            fontSize: "9px",
                            padding: "3px 8px",
                          }}
                        >
                          NEW
                        </span>
                      )}

                      <span
                        className="text-muted small"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {new Date(notif.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Action buttons (Mark read & View Exam) */}
                    <div className="d-flex align-items-center gap-1">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif._id)}
                          className="btn btn-light btn-sm py-1 px-2 rounded-2 small text-secondary border fw-semibold d-flex align-items-center gap-1"
                          style={{ fontSize: "0.75rem" }}
                          title="Mark this as read"
                        >
                          <CheckCheck size={13} className="text-primary" />
                          <span className="d-none d-sm-inline">Mark read</span>
                        </button>
                      )}

                      {notif.examination && (
                        <button
                          onClick={() => {
                            if (!notif.isRead) handleMarkAsRead(notif._id);
                            if (typeof notif.examination === "object") {
                              setSelectedExamDetails(notif.examination);
                            } else {
                              navigate("/exams");
                            }
                          }}
                          className="btn btn-primary btn-sm py-1 px-3 rounded-2 small d-flex align-items-center gap-1 fw-semibold shadow-sm"
                          style={{
                            backgroundColor: "#2563eb",
                            border: "none",
                            fontSize: "0.78rem",
                          }}
                        >
                          <Eye size={13} /> View Exam
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Message */}
                  <h5 className="fw-bold text-dark fs-6 mb-1">{notif.title}</h5>
                  <p
                    className="text-secondary small mb-3"
                    style={{ fontSize: "0.86rem", lineHeight: "1.45" }}
                  >
                    {notif.message}
                  </p>

                  {/* Exam Metadata Box */}
                  {notif.examMetadata && (
                    <div
                      className="p-2 px-3 rounded-3 border d-flex flex-wrap gap-3 small text-secondary align-items-center"
                      style={{
                        backgroundColor: "#f8fafc",
                        fontSize: "0.78rem",
                      }}
                    >
                      {notif.examMetadata.subject && (
                        <span className="d-flex align-items-center gap-1 text-dark fw-bold">
                          <BookOpen size={14} className="text-primary" />
                          {notif.examMetadata.subject} (
                          {notif.examMetadata.classGrade})
                        </span>
                      )}

                      {notif.examMetadata.examDate && (
                        <span className="d-flex align-items-center gap-1">
                          <Calendar size={13} className="text-info" />
                          Date:{" "}
                          <strong>
                            {new Date(
                              notif.examMetadata.examDate
                            ).toLocaleDateString()}
                          </strong>
                        </span>
                      )}

                      {notif.examMetadata.startTime && (
                        <span className="d-flex align-items-center gap-1">
                          <Clock size={13} className="text-warning-emphasis" />
                          Time:{" "}
                          <strong>
                            {new Date(
                              notif.examMetadata.startTime
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>
                        </span>
                      )}

                      {notif.examMetadata.durationMinutes && (
                        <span>
                          Duration:{" "}
                          <strong>
                            {notif.examMetadata.durationMinutes} mins
                          </strong>
                        </span>
                      )}

                      {notif.examMetadata.totalMarks && (
                        <span className="d-flex align-items-center gap-1 text-success fw-bold">
                          <Award size={13} /> {notif.examMetadata.totalMarks}{" "}
                          Marks
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================= MODAL: VIEW EXAM DETAILS ================= */}
        {selectedExamDetails && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg m-2 m-sm-auto">
              <div className="modal-content rounded-4 border-0 shadow">
                <div className="modal-header border-bottom p-3 p-md-4">
                  <div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-1">
                      {selectedExamDetails.classGrade} •{" "}
                      {selectedExamDetails.subject}
                    </span>
                    <h5 className="modal-title fw-bold text-dark fs-6 fs-md-5">
                      {selectedExamDetails.title}
                    </h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedExamDetails(null)}
                  />
                </div>

                <div className="modal-body p-3 p-md-4">
                  <div className="row g-2 mb-4">
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span
                          className="text-muted small d-block"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Exam Date
                        </span>
                        <span className="fw-bold text-dark small">
                          {selectedExamDetails.examDate
                            ? new Date(
                                selectedExamDetails.examDate
                              ).toLocaleDateString()
                            : "TBA"}
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span
                          className="text-muted small d-block"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Start Time
                        </span>
                        <span className="fw-bold text-dark small">
                          {selectedExamDetails.startTime
                            ? new Date(
                                selectedExamDetails.startTime
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "TBA"}
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span
                          className="text-muted small d-block"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Duration
                        </span>
                        <span className="fw-bold text-dark small">
                          {selectedExamDetails.durationMinutes || 60} mins
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 text-center">
                        <span
                          className="text-muted small d-block"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Total Marks
                        </span>
                        <span className="fw-bold text-primary small">
                          {selectedExamDetails.totalMarks || 100} Marks
                        </span>
                      </div>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark mb-2 small">
                    Candidate Guidelines
                  </h6>
                  <div
                    className="p-3 bg-light rounded-3 mb-3 small text-secondary"
                    style={{ whiteSpace: "pre-line", fontSize: "0.82rem" }}
                  >
                    {selectedExamDetails.instructions ||
                      "Read all questions carefully. Submit answers before the countdown expires."}
                  </div>

                  <div
                    className="alert alert-info py-2 px-3 small border-0 rounded-3 mb-0"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <span className="fw-semibold">Notice:</span> You are
                    registered to take this test under{" "}
                    {selectedExamDetails.classGrade}.
                  </div>
                </div>

                <div className="modal-footer border-top p-3 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-light rounded-3 px-3 py-2"
                    onClick={() => setSelectedExamDetails(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary rounded-3 d-flex align-items-center gap-2 px-4 py-2 fw-semibold"
                    style={{ backgroundColor: "#2563eb", border: "none" }}
                    onClick={() => {
                      setSelectedExamDetails(null);
                      navigate("/exams");
                    }}
                  >
                    <span>Open Exam Portal</span>
                    <ArrowRight size={15} />
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

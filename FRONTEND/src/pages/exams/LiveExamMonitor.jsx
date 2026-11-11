import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar.jsx";
import API from "../../api/api.js";
import { RefreshCw, ShieldAlert } from "lucide-react";

export default function LiveExamMonitor() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  // Action modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionType, setActionType] = useState("grant_extension");
  const [extraMinutes, setExtraMinutes] = useState(15);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const timerRef = useRef(null);

  const fetchMonitor = async () => {
    try {
      const res = await API.get(`/exams/${id}/monitor`);
      setData(res.data?.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load monitor data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
    if (autoRefresh) {
      timerRef.current = setInterval(fetchMonitor, 6000); // 6s poll
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, autoRefresh]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      await API.post(`/exams/${id}/monitor/action`, {
        studentId: selectedStudent.studentId,
        action: actionType,
        extraMinutes: Number(extraMinutes),
        reason: actionReason,
      });
      setActionMessage("Action executed successfully!");
      setTimeout(() => {
        setSelectedStudent(null);
        setActionMessage("");
        fetchMonitor();
      }, 1000);
    } catch (err) {
      setActionMessage(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div
        className="d-flex"
        style={{ minHeight: "100vh", background: "#f8fafc" }}
      >
        <Sidebar />
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading Monitor...</span>
          </div>
        </div>
      </div>
    );
  }

  const { exam, summary, sectionCounts, roster = [] } = data || {};

  // Filter roster
  const filteredRoster = roster.filter((stu) => {
    const matchesSearch =
      stu.name?.toLowerCase().includes(search.toLowerCase()) ||
      stu.schoolId?.toLowerCase().includes(search.toLowerCase()) ||
      stu.rollNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || stu.status === statusFilter;
    const matchesSection =
      sectionFilter === "all" || stu.section === sectionFilter;

    return matchesSearch && matchesStatus && matchesSection;
  });

  const total = summary?.totalEligible || 1;
  // const inProgPct = Math.round(((summary?.in_progress || 0) / total) * 100);
  // const subPct = Math.round(
  //   (((summary?.submitted || 0) + (summary?.auto_submitted || 0)) / total) * 100
  // );
  // const discPct = Math.round(((summary?.disconnected || 0) / total) * 100);
  // const absPct = Math.round(((summary?.absent || 0) / total) * 100);
  const ENTERED_STATUSES = [
    "in_progress",
    "disconnected",
    "submitted",
    "auto_submitted",
  ];

  const enteredCount = roster.filter((s) => ENTERED_STATUSES.includes(s.status))
    .length;

  const openedCount = roster.filter(
    (s) => s.openedAt || s.hasOpened || ENTERED_STATUSES.includes(s.status)
  ).length;

  const totalAttempts = roster.reduce(
    (sum, s) =>
      sum + (s.attemptCount ?? (ENTERED_STATUSES.includes(s.status) ? 1 : 0)),
    0
  );
  const reEntries = Math.max(totalAttempts - enteredCount, 0);

  const pctOf = (n) => Math.round((n / total) * 100);
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <Sidebar />
      <div className="d-flex">
    <div
      className="d-none d-lg-block flex-shrink-0"
      style={{ width: "260px" }}
    />
      <div className="flex-grow-1 p-4" style={{ overflowY: "auto" }}>
        {/* Header Bar */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4 pb-3 border-bottom bg-white p-3 rounded-3 shadow-sm">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span className="badge bg-danger d-flex align-items-center gap-1">
                <span
                  className="spinner-grow spinner-grow-sm"
                  role="status"
                  style={{ width: "8px", height: "8px" }}
                />
                LIVE EXAM MONITOR
              </span>
              <span className="badge bg-light text-dark border">
                {exam?.examCode}
              </span>
              <span className="badge bg-primary">{exam?.classGrade}</span>
            </div>
            <h4 className="fw-bold mb-0 text-dark fs-5 fs-md-4">{exam?.title}</h4>
            <div className="text-muted small mt-1">
              Subject: <strong>{exam?.subject}</strong> | Duration:{" "}
              <strong>{exam?.durationMinutes} mins</strong> | Server Time:{" "}
              <strong>{new Date(data?.serverNow).toLocaleTimeString()}</strong>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`btn btn-sm ${
                autoRefresh
                  ? "btn-outline-success active"
                  : "btn-outline-secondary"
              }`}
            >
              <RefreshCw
                size={14}
                className={`me-1 ${autoRefresh ? "spin" : ""}`}
              />
              Auto-poll (6s): {autoRefresh ? "ON" : "OFF"}
            </button>
            <button onClick={fetchMonitor} className="btn btn-sm btn-primary">
              Refresh Now
            </button>
            <Link to="/exams" className="btn btn-sm btn-outline-dark">
              Back to Exams
            </Link>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        {/* 1. Summary Cards */}
        <div className="row g-3 mb-4">
          {/* TOTAL ELIGIBLE */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #9AA5B1" }}
            >
              <div className="text-muted small fw-bold">TOTAL ELIGIBLE</div>
              <h2 className="fw-bold my-1 text-dark">
                {summary?.totalEligible || 0}
              </h2>
              <div className="small text-muted">100% Roster</div>
            </div>
          </div>

          {/* TOTAL ATTEMPTS */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #139C9C" }}
            >
              <div className="small fw-bold" style={{ color: "#139C9C" }}>
                TOTAL ATTEMPTS
              </div>
              <h2 className="fw-bold my-1" style={{ color: "#139C9C" }}>
                {totalAttempts}
              </h2>
              <div className="small text-muted">{reEntries} Re-entries</div>
            </div>
          </div>

          {/* EXAM OPENED */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #F0A500" }}
            >
              <div className="text-warning small fw-bold">EXAM OPENED</div>
              <h2 className="fw-bold my-1 text-warning">{openedCount}</h2>
              <div className="small text-muted">
                {pctOf(openedCount)}% Opened
              </div>
            </div>
          </div>

          {/* ENTERED */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #2E9E5B" }}
            >
              <div className="text-success small fw-bold">ENTERED</div>
              <h2 className="fw-bold my-1 text-success">{enteredCount}</h2>
              <div className="small text-muted">
                {pctOf(enteredCount)}% Started
              </div>
            </div>
          </div>

          {/* SUBMITTED */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #1F5FBF" }}
            >
              <div className="text-primary small fw-bold">SUBMITTED</div>
              <h2 className="fw-bold my-1 text-primary">
                {summary?.submitted || 0}
              </h2>
              <div className="small text-muted">Manual Submit</div>
            </div>
          </div>

          {/* AUTO-SUBMIT */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #E8702A" }}
            >
              <div className="small fw-bold" style={{ color: "#E8702A" }}>
                AUTO-SUBMIT
              </div>
              <h2 className="fw-bold my-1" style={{ color: "#E8702A" }}>
                {summary?.auto_submitted || 0}
              </h2>
              <div className="small text-muted">Timed Out</div>
            </div>
          </div>

          {/* ABSENT */}
          <div className="col-6 col-md-3 col-xl">
            <div
              className="card border-0 shadow-sm p-3 h-100"
              style={{ borderLeft: "4px solid #D64545" }}
            >
              <div className="text-danger small fw-bold">ABSENT</div>
              <h2 className="fw-bold my-1 text-danger">
                {summary?.absent || 0}
              </h2>
              <div className="small text-muted">
                {exam?.isWindowClosed ? "Window closed" : "Evaluated on close"}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Real-time Stacked Progress Bar */}
        <div className="card border-0 shadow-sm p-3 mb-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-2 mb-2">
  <h6 className="fw-bold mb-0">Live Participation Progression</h6>
  <div className="d-flex flex-wrap gap-2 gap-md-3 small">
              <span>
                <span className="badge me-1" style={{ background: "#2E9E5B" }}>
                  •
                </span>
                Total Eligible ({summary?.in_progress || 0})
              </span>
              <span>
                <span className="badge me-1" style={{ background: "#F0A500" }}>
                  •
                </span>
                Total Attempts ({summary?.disconnected || 0})
              </span>
              <span>
                <span className="badge me-1" style={{ background: "#9AA5B1" }}>
                  •
                </span>
                Entered ({summary?.not_started || 0})
              </span>
              <span>
                <span className="badge me-1" style={{ background: "#1F5FBF" }}>
                  •
                </span>
                Submitted ({summary?.submitted || 0})
              </span>
              <span>
                <span className="badge me-1" style={{ background: "#E8702A" }}>
                  •
                </span>
                Auto-Submitted ({summary?.auto_submitted || 0})
              </span>
              
              <span>
                <span className="badge me-1" style={{ background: "#D64545" }}>
                  •
                </span>
                Absent ({summary?.absent || 0})
              </span>
            </div>
          </div>
          <div
            className="progress"
            style={{ height: "22px", borderRadius: "8px" }}
          >
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${((summary?.in_progress || 0) / total) * 100}%`,
                backgroundColor: "#2E9E5B",
              }}
              title={`In Progress: ${summary?.in_progress}`}
            />
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${(summary?.disconnected / total) * 100}%`,
                backgroundColor: "#F0A500",
              }}
              title={`Disconnected: ${summary?.disconnected}`}
            />
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${(summary?.submitted / total) * 100}%`,
                backgroundColor: "#1F5FBF",
              }}
              title={`Submitted: ${summary?.submitted}`}
            />
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${(summary?.auto_submitted / total) * 100}%`,
                backgroundColor: "#E8702A",
              }}
              title={`Auto-Submitted: ${summary?.auto_submitted}`}
            />
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${(summary?.absent / total) * 100}%`,
                backgroundColor: "#D64545",
              }}
              title={`Absent: ${summary?.absent}`}
            />
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${(summary?.not_started / total) * 100}%`,
                backgroundColor: "#9AA5B1",
              }}
              title={`Not Started: ${summary?.not_started}`}
            />
          </div>
        </div>

        {/* 3. Section-wise Breakdowns & Filter controls */}
        <div className="card border-0 shadow-sm p-3 mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="fw-bold small text-muted">SECTIONS:</span>
              <button
                onClick={() => setSectionFilter("all")}
                className={`btn btn-sm ${
                  sectionFilter === "all"
                    ? "btn-primary"
                    : "btn-outline-secondary"
                }`}
              >
                All Sections
              </button>
              {sectionCounts?.map((sc) => (
                <button
                  key={sc.section}
                  onClick={() => setSectionFilter(sc.section)}
                  className={`btn btn-sm ${
                    sectionFilter === sc.section
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                >
                  Sec {sc.section} ({sc.in_progress + sc.submitted}/{sc.total})
                </button>
              ))}
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2 w-100 w-lg-auto">
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control form-control-sm"
                style={{ width: "200px" }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: "160px" }}
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="disconnected">Disconnected</option>
                <option value="submitted">Submitted</option>
                <option value="auto_submitted">Auto-Submitted</option>
                <option value="not_started">Not Started</option>
                <option value="absent">Absent</option>
                <option value="excused">Excused</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Student Roster Table */}
        <div className="card border-0 shadow-sm overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: "1100px" }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th>Student Name</th>
                  <th>Admission / Roll</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Face Proctoring</th>
                  <th>Answered</th>
                  <th>Time Left</th>
                  <th>Warnings / Breaches</th>
                  <th>Last Ping</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-5 text-muted">
                      No students match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map((stu, idx) => (
                    <tr key={stu.studentId}>
                      <td className="text-muted small">{idx + 1}</td>
                      <td>
                        <div className="fw-bold text-dark">{stu.name}</div>
                        <div className="small text-muted">{stu.schoolId}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          Roll: {stu.rollNumber || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          Sec {stu.section}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge text-white d-inline-flex align-items-center gap-1 px-2 py-1"
                          style={{ backgroundColor: stu.statusColor }}
                        >
                          {stu.status === "in_progress" && (
                            <span
                              className="spinner-grow spinner-grow-sm"
                              role="status"
                              style={{ width: "6px", height: "6px" }}
                            />
                          )}
                          {stu.statusLabel}
                        </span>
                        {stu.hasExtension && (
                          <span
                            className="badge ms-1 text-white"
                            style={{ backgroundColor: "#139C9C" }}
                            title={`Extension: +${stu.extensionMinutesGranted} mins`}
                          >
                            +{stu.extensionMinutesGranted}m
                          </span>
                        )}
                      </td>
                      <td>
                        {/* Face status badge & pause duration */}
                        <div className="d-flex flex-column gap-1">
                          {stu.faceStatus === "in_frame" && (
                            <span
                              className="badge bg-success text-white"
                              style={{ maxWidth: "120px" }}
                            >
                              In frame
                            </span>
                          )}
                          {stu.faceStatus === "out_of_frame" && (
                            <span
                              className="badge bg-danger text-white"
                              style={{ maxWidth: "120px" }}
                            >
                              Out of frame
                            </span>
                          )}
                          {stu.faceStatus === "multiple_faces" && (
                            <span
                              className="badge bg-danger text-white"
                              style={{ maxWidth: "120px" }}
                            >
                              Multiple faces
                            </span>
                          )}
                          {(stu.faceStatus === "unavailable" ||
                            !stu.faceStatus ||
                            stu.faceStatus === "not_started") && (
                            <span
                              className="badge bg-secondary"
                              style={{ maxWidth: "130px" }}
                            >
                              Check unavailable
                            </span>
                          )}
                          {stu.totalFacePausedSeconds > 0 && (
                            <span
                              className="small text-muted font-monospace"
                              style={{ fontSize: "0.72rem" }}
                            >
                              Paused:{" "}
                              {Math.floor(stu.totalFacePausedSeconds / 60)}m{" "}
                              {stu.totalFacePausedSeconds % 60}s
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold">
                          {stu.answeredCount} / {stu.totalQuestions}
                        </span>
                      </td>
                      <td>
                        {stu.status === "in_progress" ||
                        stu.status === "disconnected" ? (
                          <span className="badge bg-warning text-dark font-monospace">
                            {Math.floor(stu.timeRemainingSec / 60)}m{" "}
                            {stu.timeRemainingSec % 60}s
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        {stu.tabSwitchesCount > 0 ? (
                          <span
                            className={`badge px-2 py-1 ${
                              stu.tabSwitchesCount >= 3
                                ? "bg-danger text-white"
                                : "bg-warning text-dark"
                            }`}
                          >
                            <ShieldAlert size={12} className="inline me-1" />
                            {stu.tabSwitchesCount} violation(s)
                          </span>
                        ) : (
                          <span className="badge bg-success-subtle text-success">
                            Clean (0)
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="small text-muted d-flex align-items-center gap-1">
                          <span
                            className="rounded-circle"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor:
                                stu.lastHeartbeatAt &&
                                new Date() - new Date(stu.lastHeartbeatAt) <
                                  60000
                                  ? "#22c55e"
                                  : "#ef4444",
                              display: "inline-block",
                            }}
                          />
                          {stu.lastHeartbeatAt
                            ? new Date(stu.lastHeartbeatAt).toLocaleTimeString()
                            : "No ping"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          onClick={() => {
                            setSelectedStudent(stu);
                            setActionType("grant_extension");
                          }}
                          className="btn btn-sm btn-outline-primary me-1"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Modal */}
        {selectedStudent && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
          <div className="modal-dialog modal-dialog-centered m-2 m-sm-auto">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Manage Candidate: {selectedStudent.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedStudent(null)}
                  />
                </div>
                <form onSubmit={handleActionSubmit}>
                  <div className="modal-body">
                    {actionMessage && (
                      <div className="alert alert-info py-2">
                        {actionMessage}
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="form-label small fw-bold">
                        Select Administrative Action
                      </label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        className="form-select"
                      >
                        <option value="grant_extension">
                          Grant Extra Time (Extension)
                        </option>
                        <option value="reopen_attempt">Reopen Attempt</option>
                        <option value="force_submit">
                          Force Submit Attempt
                        </option>
                        <option value="mark_excused">
                          Mark as Excused / Authorized Exemption
                        </option>
                      </select>
                    </div>

                    {(actionType === "grant_extension" ||
                      actionType === "reopen_attempt") && (
                      <div className="mb-3">
                        <label className="form-label small fw-bold">
                          Extra Minutes to Add
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="60"
                          value={extraMinutes}
                          onChange={(e) => setExtraMinutes(e.target.value)}
                          className="form-control"
                        />
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label small fw-bold">
                        Mandatory Justification / Reason
                      </label>
                      <textarea
                        rows="2"
                        required
                        placeholder="e.g., Computer restart, internet glitch, or medical accommodation"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="btn btn-primary btn-sm"
                    >
                      {actionLoading ? "Executing..." : "Confirm Action"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

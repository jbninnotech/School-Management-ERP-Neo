import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar.jsx";
import API from "../../api/api.js";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  User,
  Save,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Award,
} from "lucide-react";

export default function TeacherEvaluation() {
  const { examId } = useParams();
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examId || "");
  const [submissions, setSubmissions] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Evaluation Map: { [questionId]: { marksAwarded, feedback } }
  const [evalScores, setEvalScores] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");

  // 1. Fetch Teacher's Exams List
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await API.get("/exams");
        const list = res.data?.data || [];
        setExams(list);
        if (!selectedExamId && list.length > 0) {
          setSelectedExamId(list[0]._id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, []);

  // 2. Fetch Submissions for selected exam
  const fetchSubmissions = async (eid) => {
    if (!eid) return;
    setLoading(true);
    try {
      const res = await API.get(`/exams/${eid}/submissions`);
      const subs = res.data?.data || [];
      setSubmissions(subs);

      if (subs.length > 0) {
        loadAttemptDetails(subs[0]._id);
      } else {
        setSelectedAttempt(null);
      }
    } catch (err) {
      setAlert({
        type: "danger",
        message: err.message || "Error fetching submissions",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchSubmissions(selectedExamId);
    }
  }, [selectedExamId]);

  // 3. Load single attempt details
  const loadAttemptDetails = async (attId) => {
    try {
      const res = await API.get(`/exams/attempt/${attId}`);
      const att = res.data?.data;
      setSelectedAttempt(att);
      setGeneralNotes(att.evaluationNotes || "");

      // Populate scores state for subjective questions
      const scoresMap = {};
      att.answers?.forEach((ans) => {
        scoresMap[ans.questionId] = {
          marksAwarded: ans.marksAwarded || 0,
          feedback: ans.evaluatorFeedback || "",
        };
      });
      setEvalScores(scoresMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScoreChange = (qId, marks, maxMarks) => {
    const validMarks = Math.min(Math.max(0, Number(marks) || 0), maxMarks);
    setEvalScores((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        marksAwarded: validMarks,
      },
    }));
  };

  const handleFeedbackChange = (qId, feedback) => {
    setEvalScores((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        feedback,
      },
    }));
  };

  // Calculate live totals
  const autoScore = selectedAttempt?.score?.autoScore || 0;
  const examRecord = selectedAttempt?.examination;
  const allExamQuestions = [];
  examRecord?.examSections?.forEach((sec) => {
    sec.questions?.forEach((q) => {
      allExamQuestions.push({
        ...q,
        qId: q.questionId ? q.questionId.toString() : q._id.toString(),
      });
    });
  });

  const manualScore = Object.entries(evalScores).reduce((acc, [qId, data]) => {
    const q = allExamQuestions.find((item) => item.qId === qId);
    // Only sum if question is subjective
    if (
      q &&
      [
        "short_answer",
        "long_answer",
        "case_study",
        "passage_based",
        "diagram_based",
        "image_based",
      ].includes(q.questionType)
    ) {
      return acc + (Number(data.marksAwarded) || 0);
    }
    return acc;
  }, 0);

  const totalCalculated = autoScore + manualScore;

  // Submit Evaluation
  const handleSaveEvaluation = async () => {
    if (!selectedAttempt) return;
    setSaving(true);
    try {
      const evaluationsArray = Object.entries(evalScores).map(
        ([questionId, data]) => ({
          questionId,
          marksAwarded: data.marksAwarded,
          feedback: data.feedback,
        })
      );

      await API.post(`/exams/attempt/${selectedAttempt._id}/evaluate`, {
        evaluations: evaluationsArray,
        evaluationNotes: generalNotes,
      });

      setAlert({
        type: "success",
        message: `Evaluation for "${selectedAttempt.student?.name}" saved successfully!`,
      });

      // Refresh submissions list
      fetchSubmissions(selectedExamId);
    } catch (err) {
      window.alert(err.response?.data?.message || "Error saving evaluation");
    } finally {
      setSaving(false);
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
      <style>{`
    .bank-container {
      margin-left: 260px;
      padding: 28px 36px;
      transition: margin 0.25s ease-in-out;
    }
    @media (max-width: 991.98px) {
      .bank-container {
        margin-left: 0 !important;
        padding: 74px 14px 80px 14px !important;
      }
    }
      
  `}</style>

      <Sidebar user={currentUser} />
      <main className="bank-container">
        {/* Header */}
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark fs-5">
              Descriptive Answer Evaluation
            </h3>
            <p className="text-muted small mb-0">
              Grade subjective student responses, apply scoring rubrics, and
              provide candidate feedback
            </p>
          </div>
          <div className="w-100 w-md-auto">
            <label className="small fw-semibold text-secondary mb-1 d-block">
              Select Examination
            </label>
            <select
              className="form-select bg-white shadow-sm w-100"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ minWidth: 0 }}
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.title} ({ex.classGrade})
                </option>
              ))}
            </select>
          </div>
        </div>

        {alert.message && (
          <div
            className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex justify-content-between align-items-center mb-4`}
          >
            <div>{alert.message}</div>
            <button
              className="btn-close"
              onClick={() => setAlert({ type: "", message: "" })}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted small">
              Loading candidate submissions...
            </p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <HelpCircle
              size={44}
              className="text-secondary opacity-50 mx-auto mb-2"
            />
            <h5 className="fw-semibold text-dark">No Submissions Found</h5>
            <p className="text-muted small mb-0">
              No candidates have submitted attempts for this examination yet.
            </p>
          </div>
        ) : (
          <div className="row g-4">
            {/* Left: Submissions Roster */}
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
                <h6 className="fw-bold text-dark px-2 mb-3">
                  Submissions ({submissions.length})
                </h6>
                <div className="d-flex flex-column gap-2 roster-scroll">
                  {submissions.map((sub) => {
                    const isSelected = selectedAttempt?._id === sub._id;
                    const isEvaluated =
                      sub.status === "evaluated" ||
                      sub.status === "result_published";
                    return (
                      <div
                        key={sub._id}
                        className={`p-3 rounded-3 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary-subtle border-primary shadow-sm"
                            : "bg-light border-light"
                        }`}
                        onClick={() => {
                          loadAttemptDetails(sub._id);
                          if (window.innerWidth < 992) {
                            setTimeout(() => {
                              document
                                .getElementById("eval-panel")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            }, 150);
                          }
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-dark">
                            {sub.student?.name}
                          </span>
                          <span
                            className={`badge ${
                              isEvaluated
                                ? "bg-success-subtle text-success"
                                : "bg-warning-subtle text-warning-emphasis"
                            }`}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {isEvaluated ? "Evaluated" : "Grading Pending"}
                          </span>
                        </div>
                        <div className="small text-muted font-monospace mb-1">
                          Roll #
                          {sub.student?.studentProfile?.rollNumber || "N/A"} •
                          Sec {sub.student?.studentProfile?.section || "A"}
                        </div>
                        <div className="d-flex justify-content-between small text-secondary">
                          <span>Auto-Score: {sub.score?.autoScore || 0}</span>
                          <span className="fw-bold text-primary">
                            Total: {sub.score?.totalScore || 0} M
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Interactive Evaluation Paper */}
            {selectedAttempt && (
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm rounded-4 bg-white p-3 p-md-4">
                  {/* Header bar */}
                  <div className="border-bottom pb-3 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div style={{ minWidth: 0 }}>
                      <h5 className="fw-bold text-dark mb-1 fs-6">
                        Candidate: {selectedAttempt.student?.name}
                      </h5>
                      <div className="small text-muted font-monospace">
                        School ID: {selectedAttempt.student?.schoolId} • Roll #
                        {selectedAttempt.student?.studentProfile?.rollNumber}
                      </div>
                    </div>

                    <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100 w-md-auto">
                      <div className="d-flex justify-content-between align-items-center d-md-block text-md-end bg-light rounded-3 px-3 py-2">
                        <span className="small text-muted d-block">Score:</span>
                        <span className="fs-5 fw-bold text-success font-monospace">
                          {totalCalculated} / {examRecord?.totalMarks}
                        </span>
                      </div>
                      <button
                        className="btn btn-primary fw-bold px-3 py-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2 w-100 w-md-auto"
                        style={{ minHeight: "44px" }}
                        onClick={handleSaveEvaluation}
                        disabled={saving}
                      >
                        <Save size={16} />{" "}
                        {saving ? "Saving..." : "Save Grading"}
                      </button>
                    </div>
                  </div>

                  {/* Questions Evaluation Feed */}
                  <div className="d-flex flex-column gap-4 eval-scroll">
                    {allExamQuestions.map((q, idx) => {
                      const ansSlot = selectedAttempt.answers?.find(
                        (a) => a.questionId === q.qId
                      );
                      const isSubjective = [
                        "short_answer",
                        "long_answer",
                        "case_study",
                        "passage_based",
                        "diagram_based",
                        "image_based",
                      ].includes(q.questionType);
                      const currentScoreData = evalScores[q.qId] || {
                        marksAwarded: 0,
                        feedback: "",
                      };

                      return (
                        <div
                          key={q.qId || idx}
                          className="p-3 border rounded-3 bg-light"
                        >
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <span className="fw-bold text-dark">
                              Question {idx + 1}{" "}
                              <span className="badge bg-secondary-subtle text-secondary ms-1">
                                {/* {q.questionType?.replace("_", " ")} */}
                                {q.questionType?.replace(/_/g, " ")}
                              </span>
                            </span>
                            <span className="badge bg-light text-dark border">
                              Max Marks: {q.marks}
                            </span>
                          </div>

                          <p
                            className="text-dark mb-2"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {q.questionText}
                          </p>

                          {/* Student's Submitted Answer Box */}
                          <div className="p-3 bg-white rounded-3 border mb-3">
                            <span className="text-muted small fw-semibold d-block mb-1">
                              Candidate's Submitted Response:
                            </span>
                            <div
                              className="fw-semibold text-dark"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {ansSlot?.studentAnswer ? (
                                typeof ansSlot.studentAnswer === "object" ? (
                                  JSON.stringify(ansSlot.studentAnswer, null, 2)
                                ) : (
                                  String(ansSlot.studentAnswer)
                                )
                              ) : (
                                <span className="text-muted fst-italic">
                                  Question was left unanswered by candidate.
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Suggested Rubric */}
                          {q.correctAnswer && (
                            <div className="p-2 bg-info-subtle text-info-emphasis rounded-2 small mb-3">
                              <strong>Suggested Key / Rubric: </strong>
                              {Array.isArray(q.correctAnswer)
                                ? q.correctAnswer.join(", ")
                                : String(q.correctAnswer)}
                            </div>
                          )}

                          {/* Grading Inputs */}
                          {isSubjective ? (
                            <div className="row g-2 align-items-center mt-2 border-top pt-2">
                              <div className="col-md-4">
                                <label className="form-label small fw-semibold text-dark mb-1">
                                  Marks Awarded (Max: {q.marks})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={q.marks}
                                  step="0.5"
                                  className="form-control form-control-sm font-monospace fw-bold"
                                  value={currentScoreData.marksAwarded}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      q.qId,
                                      e.target.value,
                                      q.marks
                                    )
                                  }
                                />
                              </div>
                              <div className="col-md-8">
                                <label className="form-label small fw-semibold text-dark mb-1">
                                  Examiner Feedback / Comments
                                </label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Specific remarks on answer accuracy..."
                                  value={currentScoreData.feedback}
                                  onChange={(e) =>
                                    handleFeedbackChange(q.qId, e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="small text-muted border-top pt-2 d-flex justify-content-between">
                              <span>Auto-Evaluated by Objective Engine</span>
                              <span className="fw-bold text-success font-monospace">
                                {ansSlot?.marksAwarded || 0} / {q.marks} Marks
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Overall Notes */}
                    <div className="p-3 bg-light rounded-3 border">
                      <label className="form-label small fw-semibold text-dark mb-1">
                        Overall Examiner Evaluation Notes / Institutional
                        Remarks
                      </label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm"
                        placeholder="Final remarks recorded on student certificate..."
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

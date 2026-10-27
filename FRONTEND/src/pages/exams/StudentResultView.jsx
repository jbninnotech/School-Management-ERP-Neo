import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ArrowLeft,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  BookOpen
} from 'lucide-react';

export default function StudentResultView() {
  const { id } = useParams(); // examId
  const [searchParams] = useSearchParams();
  const queryStudentId = searchParams.get('studentId');

  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = currentUser?.role || 'student';

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      try {
        const url = queryStudentId
          ? `/exams/${id}/results?studentId=${queryStudentId}`
          : `/exams/${id}/results`;
        const res = await API.get(url);
        setResultData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error fetching scorecard');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id, queryStudentId]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Sidebar user={currentUser} />
        <main style={{ marginLeft: '260px', padding: '60px', textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Retrieving official candidate scorecard...</p>
        </main>
      </div>
    );
  }

  // If unpublished for student
  if (resultData && !resultData.isPublished && role === 'student') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Sidebar user={currentUser} />
        <main style={{ marginLeft: '260px', padding: '60px', textAlign: 'center' }}>
          <div className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white" style={{ maxWidth: '600px' }}>
            <Clock size={48} className="text-warning mx-auto mb-3" />
            <h4 className="fw-bold text-dark mb-2">Evaluation In Progress</h4>
            <p className="text-secondary small mb-4">
              Your examination attempt has been securely received. Official scorecards and solution keys are currently being finalized and have not been released by the Principal.
            </p>
            <Link to="/exams" className="btn btn-primary px-4 fw-semibold rounded-3">
              Return to Examinations Hub
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { exam, attempt, detailedReview } = resultData?.data || {};
  const isPassed = attempt?.score?.isPassed;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>

        {/* Top bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <Link to="/exams" className="btn btn-outline-secondary btn-sm rounded-circle p-2">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h4 className="fw-bold mb-0 text-dark">Official Examination Report Card</h4>
              <small className="text-muted">{exam?.title} • {exam?.subject}</small>
            </div>
          </div>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={() => window.print()}>
            <Printer size={15} /> Print Certificate
          </button>
        </div>

        {/* Certificate Score Hero Banner */}
        <div className={`card border-0 shadow-sm rounded-4 p-4 p-md-5 mb-4 text-white ${isPassed ? 'bg-success' : 'bg-dark'}`}>
          <div className="row align-items-center g-4">
            <div className="col-md-8">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-white text-dark font-monospace">{exam?.examCode}</span>
                <span className="badge bg-white text-dark">{exam?.classGrade}</span>
              </div>
              <h2 className="fw-bold mb-1">{attempt?.student?.name}</h2>
              <div className="small opacity-75 font-monospace mb-3">
                School ID: {attempt?.student?.schoolId} • Roll #{attempt?.student?.studentProfile?.rollNumber || '1001'}
              </div>
              <div className="d-flex gap-3 small">
                <span>Submitted: {attempt?.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A'}</span>
                <span>•</span>
                <span>Duration: {exam?.durationMinutes} Mins</span>
              </div>
            </div>

            <div className="col-md-4 text-md-end">
              <div className="p-3 rounded-4 bg-white bg-opacity-10 d-inline-block text-center" style={{ minWidth: '180px' }}>
                <span className="text-uppercase small fw-bold opacity-75 d-block mb-1">Total Score</span>
                <h1 className="fw-bold mb-0 font-monospace">
                  {attempt?.score?.totalScore} <span className="fs-6 opacity-75 fw-normal">/ {attempt?.score?.maxMarks}</span>
                </h1>
                <div className="mt-2">
                  <span className={`badge px-3 py-1 rounded-pill ${isPassed ? 'bg-white text-success fw-bold' : 'bg-danger text-white fw-bold'}`}>
                    {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'} ({attempt?.score?.percentage?.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section-Wise Marks Breakdown */}
        {attempt?.score?.sectionWiseScores && attempt.score.sectionWiseScores.length > 0 && (
          <div className="row g-3 mb-4">
            {attempt.score.sectionWiseScores.map((sec, idx) => (
              <div key={idx} className="col-md-4">
                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                  <span className="text-muted small fw-semibold text-uppercase">{sec.title}</span>
                  <h4 className="fw-bold text-dark my-1 font-monospace">
                    {sec.marksObtained} <span className="fs-6 text-muted fw-normal">/ {sec.maxMarks}</span>
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question-By-Question Detailed Solution Review */}
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <h5 className="fw-bold text-dark mb-1">Detailed Question Performance & Answer Keys</h5>
          <p className="text-muted small mb-4">Review your submitted choices alongside verified answer keys and examiner feedback</p>

          <div className="d-flex flex-column gap-4">
            {detailedReview?.map((q, idx) => {
              const isFullMarks = q.marksAwarded === q.marks;
              const isNegative = q.marksAwarded < 0;

              return (
                <div key={q.questionId || idx} className="p-3 border rounded-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-dark">
                      Question {idx + 1} • <span className="badge bg-secondary-subtle text-secondary">{q.questionType?.replace('_', ' ')}</span>
                    </span>
                    <span className={`badge ${isFullMarks ? 'bg-success' : isNegative ? 'bg-danger' : 'bg-secondary'} font-monospace px-3 py-1`}>
                      {q.marksAwarded} / {q.marks} Marks
                    </span>
                  </div>

                  <p className="text-dark fw-semibold mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {q.questionText}
                  </p>

                  {/* Options */}
                  {q.options && q.options.length > 0 && (
                    <div className="row g-2 mb-3 ps-2">
                      {q.options.map((opt, oIdx) => {
                        const isStudentChoice = Array.isArray(q.studentAnswer)
                          ? q.studentAnswer.includes(opt.id)
                          : q.studentAnswer === opt.id;
                        const isCorrectKey = Array.isArray(q.correctAnswer)
                          ? q.correctAnswer.includes(opt.id)
                          : q.correctAnswer === opt.id;

                        let badgeStyle = 'bg-white text-secondary border';
                        if (isCorrectKey) badgeStyle = 'bg-success-subtle text-success border-success fw-bold';
                        if (isStudentChoice && !isCorrectKey) badgeStyle = 'bg-danger-subtle text-danger border-danger fw-bold';

                        return (
                          <div key={oIdx} className="col-md-6 small">
                            <div className={`p-2 rounded-2 ${badgeStyle}`}>
                              <span className="font-monospace fw-bold me-1">({String.fromCharCode(65 + oIdx)})</span>
                              <span>{opt.text}</span>
                              {isStudentChoice && <span className="ms-2 badge bg-dark text-white">Your Choice</span>}
                              {isCorrectKey && <span className="ms-2 badge bg-success text-white">Correct Key</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Subjective or non-option answers */}
                  {!q.options?.length && (
                    <div className="p-3 bg-white rounded-3 border mb-3 small">
                      <div className="mb-2">
                        <span className="text-muted fw-semibold d-block">Your Submitted Response:</span>
                        <span className="fw-bold text-dark">
                          {q.studentAnswer ? String(q.studentAnswer) : '<Unanswered>'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted fw-semibold d-block">Official Answer Key / Rubric:</span>
                        <span className="fw-bold text-success">
                          {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Solution Explanation */}
                  {q.explanation && (
                    <div className="p-2 bg-light rounded-2 text-muted small border-start border-3 border-primary">
                      <strong>Solution Explanation: </strong>
                      {q.explanation}
                    </div>
                  )}

                  {/* Examiner feedback if subjective */}
                  {q.evaluatorFeedback && (
                    <div className="mt-2 p-2 bg-info-subtle text-info-emphasis rounded-2 small">
                      <strong>Teacher Feedback: </strong>
                      {q.evaluatorFeedback}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}

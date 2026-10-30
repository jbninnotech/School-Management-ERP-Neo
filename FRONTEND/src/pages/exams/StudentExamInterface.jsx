import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/api.js';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Maximize,
  Minimize,
  Eye,
  ShieldAlert,
  HelpCircle,
  Calculator
} from 'lucide-react';

export default function StudentExamInterface() {
  const { id } = useParams(); // examId
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Student Responses dictionary: { [questionId]: { studentAnswer, isMarkedForReview, visited, isAnswered } }
  const [responses, setResponses] = useState({});
  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('saved'); // 'saving' | 'saved' | 'error'

  // Modals & Tools
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Countdown timer ref
  const timerRef = useRef(null);

  // 1. Initialize Examination Attempt
  useEffect(() => {
    const initExam = async () => {
      setLoading(true);
      try {
        const res = await API.post(`/exams/${id}/start-attempt`);
        const { attempt: att, exam: ex, timeRemainingSeconds } = res.data?.data || {};

        setExam(ex);
        setAttempt(att);
        setSecondsRemaining(timeRemainingSeconds || 3600);

        // Flatten all questions across sections into a single linear array
        const allQs = [];
        ex.examSections?.forEach((sec) => {
          sec.questions?.forEach((q) => {
            allQs.push({
              ...q,
              sectionId: sec.id,
              sectionTitle: sec.title,
            });
          });
        });

        // If randomize question order is configured
        if (ex.randomizeQuestionOrder) {
          allQs.sort(() => Math.random() - 0.5);
        }
        setQuestions(allQs);

        // Populate responses map from attempt
        const respMap = {};
        allQs.forEach((q, idx) => {
          const qId = q.questionId ? q.questionId.toString() : q._id.toString();
          const existingAns = att.answers?.find((a) => a.questionId === qId);

          respMap[qId] = {
            studentAnswer: existingAns ? existingAns.studentAnswer : null,
            isAnswered: existingAns ? existingAns.isAnswered : false,
            isMarkedForReview: existingAns ? existingAns.isMarkedForReview : false,
            visited: idx === 0 ? true : (existingAns ? existingAns.visited : false),
          };
        });
        setResponses(respMap);

      } catch (err) {
        window.alert(err.response?.data?.message || err.message || 'Error starting exam');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [id]);

  // 2. Authoritative Timer Loop
  useEffect(() => {
    if (loading || !attempt) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, attempt]);

  // 3. Tab Visibility / Anti-Cheat Listener
  useEffect(() => {
    if (!exam || !exam.fullScreenWarningEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && attempt) {
        setTabSwitchCount((prev) => prev + 1);
        setShowTabWarning(true);
        try {
          await API.post('/exams/tab-switch', {
            attemptId: attempt._id,
            reason: 'Tab switch / focus lost event',
          });
        } catch (e) {
          console.warn('Failed to record tab switch:', e.message);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [exam, attempt]);

  // 4. Background Heartbeat Ping (Every 15s to maintain live status)
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;

    const heartbeatInterval = setInterval(async () => {
      try {
        const res = await API.post(`/exams/attempts/${attempt._id}/heartbeat`);
        if (res.data?.timeRemainingSeconds !== undefined) {
          // Re-sync client timer with authoritative server deadline
          setSecondsRemaining(res.data.timeRemainingSeconds);
        }
      } catch (err) {
        console.warn('Heartbeat ping failed:', err.message);
      }
    }, 15000);

    return () => clearInterval(heartbeatInterval);
  }, [attempt]);

  // Mark current question as visited
  const currentQ = questions[currentQIndex];
  const currentQId = currentQ ? (currentQ.questionId ? currentQ.questionId.toString() : currentQ._id.toString()) : null;

  useEffect(() => {
    if (currentQId && responses[currentQId] && !responses[currentQId].visited) {
      setResponses((prev) => ({
        ...prev,
        [currentQId]: { ...prev[currentQId], visited: true },
      }));
    }
  }, [currentQIndex, currentQId]);

  // Save current answer incrementally to dedicated AttemptAnswer backend
  const seqRef = useRef(1);
  const saveAnswerToBackend = async (qId, answerData) => {
    if (!attempt) return;
    setSavingStatus('saving');
    seqRef.current += 1;
    try {
      await API.put(`/exams/attempts/${attempt._id}/answers/${qId}`, {
        answer: answerData.studentAnswer,
        clientSeq: seqRef.current,
        clientTimestamp: new Date(),
        isMarkedForReview: answerData.isMarkedForReview,
        visited: true,
        sectionId: currentQ?.sectionId || 'sec_1',
        questionType: currentQ?.questionType || 'single_mcq',
      });
      setSavingStatus('saved');
    } catch (err) {
      // Fallback to old save endpoint if needed
      try {
        await API.post('/exams/save-answer', {
          attemptId: attempt._id,
          questionId: qId,
          studentAnswer: answerData.studentAnswer,
          isMarkedForReview: answerData.isMarkedForReview,
          visited: true,
        });
        setSavingStatus('saved');
      } catch (e) {
        setSavingStatus('error');
      }
    }
  };

  const handleSelectAnswer = (value) => {
    if (!currentQId) return;
    const isAns = value !== null && value !== undefined && value !== '';
    const updated = {
      ...responses[currentQId],
      studentAnswer: value,
      isAnswered: isAns,
      visited: true,
    };
    setResponses((prev) => ({ ...prev, [currentQId]: updated }));
    saveAnswerToBackend(currentQId, updated);
  };

  const handleToggleMultiSelect = (optId) => {
    if (!currentQId) return;
    const currentList = Array.isArray(responses[currentQId]?.studentAnswer)
      ? [...responses[currentQId].studentAnswer]
      : [];
    const updatedList = currentList.includes(optId)
      ? currentList.filter((id) => id !== optId)
      : [...currentList, optId];

    handleSelectAnswer(updatedList);
  };

  const handleClearResponse = () => {
    if (!currentQId) return;
    const cleared = {
      ...responses[currentQId],
      studentAnswer: null,
      isAnswered: false,
    };
    setResponses((prev) => ({ ...prev, [currentQId]: cleared }));
    saveAnswerToBackend(currentQId, cleared);
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentQId) return;
    const updated = {
      ...responses[currentQId],
      isMarkedForReview: !responses[currentQId]?.isMarkedForReview,
      visited: true,
    };
    setResponses((prev) => ({ ...prev, [currentQId]: updated }));
    saveAnswerToBackend(currentQId, updated);

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const handleSaveAndNext = () => {
    if (currentQId && responses[currentQId]) {
      saveAnswerToBackend(currentQId, responses[currentQId]);
    }
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  // Final Submission Handler
  const handleFinalSubmit = async (isTimeout = false) => {
    if (!attempt) return;
    setLoading(true);
    try {
      const res = await API.post('/exams/submit-attempt', {
        attemptId: attempt._id,
        submissionType: isTimeout ? 'auto_timeout' : 'manual',
      });
      if (res.data?.success) {
        window.alert(
          isTimeout
            ? 'Exam duration has ended. Your responses were automatically submitted.'
            : 'Examination submitted successfully!'
        );
        navigate(`/exams/${id}/results`);
      }
    } catch (err) {
      window.alert(err.response?.data?.message || 'Error submitting exam');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = () => {
    handleFinalSubmit(true);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Calculator evaluation
  const handleCalcClick = (val) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (val === '=') {
      try {
        // Safe evaluation of basic math expressions
        const sanitized = calcInput.replace(/[^0-9+\-*/().]/g, '');
        const res = Function(`"use strict"; return (${sanitized})`)();
        setCalcResult(String(res));
      } catch {
        setCalcResult('Error');
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  // Format Time (HH:MM:SS)
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Palette Status Counts
  const answeredCount = Object.values(responses).filter((r) => r.isAnswered && !r.isMarkedForReview).length;
  const markedReviewCount = Object.values(responses).filter((r) => r.isMarkedForReview && !r.isAnswered).length;
  const answeredAndMarkedCount = Object.values(responses).filter((r) => r.isAnswered && r.isMarkedForReview).length;
  const visitedUnansweredCount = Object.values(responses).filter((r) => r.visited && !r.isAnswered && !r.isMarkedForReview).length;
  const notVisitedCount = questions.length - (answeredCount + markedReviewCount + answeredAndMarkedCount + visitedUnansweredCount);

  if (loading || !currentQ) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} />
          <h5 className="fw-bold text-dark">Initializing Secure Examination Interface...</h5>
          <p className="text-muted small">Synchronizing timer and exam snapshot with server</p>
        </div>
      </div>
    );
  }

  const currentResp = responses[currentQId] || {};
  const isTimeCritical = secondsRemaining < 300; // Under 5 mins

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* 1. TOP SECURE EXAM HEADER */}
      <header className="bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-3 bg-primary text-white p-2 fw-bold">
            NEO
          </div>
          <div>
            <h5 className="fw-bold text-dark mb-0">{exam.title}</h5>
            <small className="text-muted">
              {exam.subject} • Class: {exam.classGrade} • Candidate: <strong>{currentUser?.name}</strong> ({currentUser?.schoolId})
            </small>
          </div>
        </div>

        {/* Center: Authoritative Countdown Timer */}
        <div className="d-flex align-items-center gap-2">
          <div
            className={`d-flex align-items-center gap-2 px-3 py-1 rounded-pill fw-bold font-monospace shadow-sm ${
              isTimeCritical ? 'bg-danger text-white animate-pulse' : 'bg-dark text-white'
            }`}
            style={{ fontSize: '1.25rem', letterSpacing: '1px' }}
          >
            <Clock size={20} className={isTimeCritical ? 'animate-bounce' : ''} />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {exam.calculatorAllowed && (
            <button
              className="btn btn-outline-secondary btn-sm rounded-pill p-2"
              onClick={() => setShowCalculator(!showCalculator)}
              title="Open Calculator"
            >
              <Calculator size={18} />
            </button>
          )}

          <button
            className="btn btn-outline-secondary btn-sm rounded-pill p-2"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>

        {/* Right: Autosave status & Submit */}
        <div className="d-flex align-items-center gap-3">
          <div className="small">
            {savingStatus === 'saving' && <span className="text-muted">Saving response...</span>}
            {savingStatus === 'saved' && <span className="text-success"><CheckCircle2 size={14} className="inline me-1" />Saved</span>}
            {savingStatus === 'error' && <span className="text-danger"><AlertTriangle size={14} className="inline me-1" />Save Error</span>}
          </div>
          <button
            className="btn btn-success fw-bold px-4 py-2 rounded-3 shadow-sm d-flex align-items-center gap-2"
            onClick={() => setShowSubmitModal(true)}
          >
            <Send size={16} /> Submit Exam
          </button>
        </div>
      </header>

      {/* 2. MAIN TEST CONTENT & PALETTE SPLIT LAYOUT */}
      <div className="d-flex flex-grow-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>

        {/* LEFT / CENTER: QUESTION WORKSPACE */}
        <div className="flex-grow-1 d-flex flex-column bg-white p-4 overflow-y-auto" style={{ borderRight: '1px solid #e2e8f0' }}>

          {/* Question Breadcrumb & Marks */}
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary fs-6 px-3 py-2 rounded-3">Question {currentQIndex + 1}</span>
              <span className="text-muted small fw-semibold">of {questions.length}</span>
              <span className="badge bg-light text-dark border ms-2 text-uppercase">{currentQ.sectionTitle}</span>
              <span className="badge bg-secondary-subtle text-secondary text-uppercase">{currentQ.questionType?.replace('_', ' ')}</span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                +{currentQ.marks} Marks
              </span>
              {currentQ.negativeMarks > 0 && (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                  -{currentQ.negativeMarks} Neg
                </span>
              )}
            </div>
          </div>

          {/* Reading Passage if passage_based / case_study */}
          {currentQ.passageText && (
            <div className="p-3 bg-light rounded-3 mb-4 border small" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <strong className="text-dark d-block mb-1">Reference Context / Passage:</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{currentQ.passageText}</div>
            </div>
          )}

          {/* Question Stem */}
          <div className="mb-4">
            <h5 className="fw-semibold text-dark lh-base" style={{ whiteSpace: 'pre-wrap' }}>
              {currentQ.questionText}
            </h5>
            {currentQ.imageUrl && (
              <div className="my-3 text-center">
                <img
                  src={currentQ.imageUrl}
                  alt="Question Diagram"
                  className="img-fluid rounded-3 border shadow-sm"
                  style={{ maxHeight: '280px' }}
                />
              </div>
            )}
          </div>

          {/* RESPONSE CONTROLS (SPECIALIZED PER TYPE) */}
          <div className="my-auto">

            {/* 1. SINGLE MCQ & ASSERTION REASON */}
            {['single_mcq', 'assertion_reason'].includes(currentQ.questionType) && currentQ.options && (
              <div className="d-flex flex-column gap-3">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = currentResp.studentAnswer === opt.id;
                  return (
                    <div
                      key={opt.id || oIdx}
                      className={`p-3 rounded-3 border cursor-pointer transition-all d-flex align-items-center gap-3 ${
                        isSelected ? 'bg-primary-subtle border-primary shadow-sm fw-semibold text-primary' : 'bg-light hover-bg-white text-dark'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectAnswer(opt.id)}
                    >
                      <input
                        type="radio"
                        className="form-check-input mt-0"
                        name="singleOptionRadio"
                        checked={isSelected}
                        onChange={() => handleSelectAnswer(opt.id)}
                      />
                      <span className="font-monospace fw-bold">({String.fromCharCode(65 + oIdx)})</span>
                      <span className="flex-grow-1">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. MULTIPLE SELECT */}
            {currentQ.questionType === 'multiple_select' && currentQ.options && (
              <div className="d-flex flex-column gap-3">
                <small className="text-muted mb-1">Select all correct options that apply:</small>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = Array.isArray(currentResp.studentAnswer) && currentResp.studentAnswer.includes(opt.id);
                  return (
                    <div
                      key={opt.id || oIdx}
                      className={`p-3 rounded-3 border cursor-pointer transition-all d-flex align-items-center gap-3 ${
                        isSelected ? 'bg-primary-subtle border-primary shadow-sm fw-semibold text-primary' : 'bg-light hover-bg-white text-dark'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleMultiSelect(opt.id)}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={isSelected}
                        onChange={() => handleToggleMultiSelect(opt.id)}
                      />
                      <span className="font-monospace fw-bold">({String.fromCharCode(65 + oIdx)})</span>
                      <span className="flex-grow-1">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. TRUE / FALSE */}
            {currentQ.questionType === 'true_false' && (
              <div className="d-flex gap-4 my-3">
                <button
                  type="button"
                  className={`btn btn-lg flex-fill py-3 fw-bold rounded-4 border ${
                    currentResp.studentAnswer === true || currentResp.studentAnswer === 'true'
                      ? 'btn-success shadow'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleSelectAnswer(true)}
                >
                  TRUE
                </button>
                <button
                  type="button"
                  className={`btn btn-lg flex-fill py-3 fw-bold rounded-4 border ${
                    currentResp.studentAnswer === false || currentResp.studentAnswer === 'false'
                      ? 'btn-danger shadow'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => handleSelectAnswer(false)}
                >
                  FALSE
                </button>
              </div>
            )}

            {/* 4. FILL IN THE BLANKS / ONE WORD */}
            {['fill_blanks', 'one_word'].includes(currentQ.questionType) && (
              <div className="my-3">
                <label className="form-label small fw-semibold text-secondary">Your Answer Response:</label>
                <input
                  type="text"
                  className="form-control form-control-lg font-monospace"
                  placeholder="Type answer here..."
                  value={currentResp.studentAnswer || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
              </div>
            )}

            {/* 5. NUMERICAL ANSWER */}
            {currentQ.questionType === 'numerical' && (
              <div className="my-3">
                <label className="form-label small fw-semibold text-secondary">Enter Numerical Value:</label>
                <input
                  type="number"
                  step="any"
                  className="form-control form-control-lg font-monospace"
                  placeholder="e.g. 44"
                  value={currentResp.studentAnswer || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
                <small className="text-muted mt-1 d-block">
                  Rounding tolerance of ±{currentQ.numericalTolerance || 0} is configured.
                </small>
              </div>
            )}

            {/* 6. MATCH THE FOLLOWING */}
            {currentQ.questionType === 'match_following' && currentQ.matchPairs && (
              <div className="my-3 p-3 bg-light rounded-3 border">
                <h6 className="fw-semibold text-dark mb-3">Match pairs from Column 1 to Column 2:</h6>
                {currentQ.matchPairs.map((pair, pIdx) => {
                  const currentMatched = Array.isArray(currentResp.studentAnswer)
                    ? currentResp.studentAnswer.find((m) => m.left === pair.left)?.right || ''
                    : '';
                  return (
                    <div key={pIdx} className="row g-2 align-items-center mb-3">
                      <div className="col-5 fw-semibold text-dark">{pair.left}</div>
                      <div className="col-1 text-center text-muted">➔</div>
                      <div className="col-6">
                        <select
                          className="form-select form-select-sm"
                          value={currentMatched}
                          onChange={(e) => {
                            const currentArr = Array.isArray(currentResp.studentAnswer) ? [...currentResp.studentAnswer] : [];
                            const updated = currentArr.filter((m) => m.left !== pair.left);
                            if (e.target.value) {
                              updated.push({ left: pair.left, right: e.target.value });
                            }
                            handleSelectAnswer(updated);
                          }}
                        >
                          <option value="">Select Matching Option...</option>
                          {currentQ.matchPairs.map((p, optIdx) => (
                            <option key={optIdx} value={p.right}>{p.right}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 7. DESCRIPTIVE SHORT / LONG ANSWER / CASE STUDY */}
            {['short_answer', 'long_answer', 'case_study', 'passage_based', 'diagram_based', 'image_based'].includes(currentQ.questionType) && (
              <div className="my-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-semibold text-secondary mb-0">Detailed Written Answer:</label>
                  <span className="small text-muted font-monospace">
                    Words: {currentResp.studentAnswer ? currentResp.studentAnswer.trim().split(/\s+/).filter(Boolean).length : 0}
                  </span>
                </div>
                <textarea
                  rows="6"
                  className="form-control"
                  placeholder="Type your complete solution or response steps here..."
                  value={currentResp.studentAnswer || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
              </div>
            )}

          </div>

          {/* BOTTOM WORKSPACE ACTION BUTTONS */}
          <div className="border-top pt-3 mt-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-3 px-3 d-flex align-items-center gap-1"
                onClick={handleClearResponse}
                disabled={!currentResp.isAnswered}
              >
                <RotateCcw size={14} /> Clear Response
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-3 px-3 d-flex align-items-center gap-1 ${
                  currentResp.isMarkedForReview ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'
                }`}
                onClick={handleMarkForReviewAndNext}
              >
                <Bookmark size={14} /> {currentResp.isMarkedForReview ? 'Unmark Review' : 'Mark for Review'}
              </button>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-dark btn-sm rounded-3 px-3 d-flex align-items-center gap-1"
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0 || !exam.allowPreviousNavigation}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-3 px-4 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                style={{ backgroundColor: '#2563eb' }}
                onClick={handleSaveAndNext}
              >
                Save & Next <ChevronRight size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT: QUESTION NAVIGATION PALETTE */}
        <div className="bg-light p-3 d-flex flex-column overflow-y-auto" style={{ width: '320px', minWidth: '320px' }}>
          
          <h6 className="fw-bold text-dark mb-3">Question Palette</h6>

          {/* Legend Counters */}
          <div className="row g-2 mb-3 small" style={{ fontSize: '0.75rem' }}>
            <div className="col-6">
              <div className="d-flex align-items-center gap-2">
                <span className="badge rounded-circle bg-success p-2" style={{ width: 14, height: 14 }} />
                <span>Answered: <strong>{answeredCount}</strong></span>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center gap-2">
                <span className="badge rounded-circle bg-danger p-2" style={{ width: 14, height: 14 }} />
                <span>Unanswered: <strong>{visitedUnansweredCount}</strong></span>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center gap-2">
                <span className="badge rounded-circle bg-warning p-2" style={{ width: 14, height: 14 }} />
                <span>Review: <strong>{markedReviewCount}</strong></span>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center gap-2">
                <span className="badge rounded-circle bg-secondary p-2" style={{ width: 14, height: 14 }} />
                <span>Not Visited: <strong>{notVisitedCount}</strong></span>
              </div>
            </div>
          </div>

          <hr className="my-2 opacity-25" />

          {/* Question Grid Buttons */}
          <div className="d-flex flex-wrap gap-2 my-2">
            {questions.map((q, idx) => {
              const qId = q.questionId ? q.questionId.toString() : q._id.toString();
              const resp = responses[qId] || {};
              const isCurrent = currentQIndex === idx;

              let btnClass = 'bg-secondary text-white'; // Not visited
              if (resp.visited && !resp.isAnswered && !resp.isMarkedForReview) btnClass = 'bg-danger text-white';
              if (resp.isAnswered && !resp.isMarkedForReview) btnClass = 'bg-success text-white';
              if (resp.isMarkedForReview && !resp.isAnswered) btnClass = 'bg-warning text-dark';
              if (resp.isAnswered && resp.isMarkedForReview) btnClass = 'bg-warning text-dark border border-success border-3';

              return (
                <button
                  key={idx}
                  type="button"
                  className={`btn btn-sm rounded-circle fw-bold p-0 d-flex align-items-center justify-content-center ${btnClass} ${
                    isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{ width: '38px', height: '38px', fontSize: '0.85rem' }}
                  onClick={() => {
                    if (exam.questionNavigation === 'free') {
                      setCurrentQIndex(idx);
                    }
                  }}
                  disabled={exam.questionNavigation !== 'free'}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Floating On-Screen Calculator */}
          {showCalculator && (
            <div className="mt-auto p-3 bg-white rounded-3 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-bold text-dark">Calculator</span>
                <button className="btn-close" style={{ transform: 'scale(0.8)' }} onClick={() => setShowCalculator(false)} />
              </div>
              <div className="bg-light p-2 rounded text-end font-monospace mb-2" style={{ minHeight: '36px' }}>
                <div className="small text-muted">{calcInput || '0'}</div>
                <div className="fw-bold fs-6 text-dark">{calcResult}</div>
              </div>
              <div className="row g-1 text-center">
                {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map((key) => (
                  <div key={key} className="col-3">
                    <button
                      className="btn btn-outline-secondary btn-sm w-100 py-1 font-monospace"
                      onClick={() => handleCalcClick(key)}
                    >
                      {key}
                    </button>
                  </div>
                ))}
                <div className="col-12 mt-1">
                  <button className="btn btn-danger btn-sm w-100 py-0" onClick={() => handleCalcClick('C')}>Clear</button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 3. CONFIRMATION MODAL BEFORE SUBMIT */}
      {showSubmitModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">Confirm Examination Submission</h5>
                <button className="btn-close" onClick={() => setShowSubmitModal(false)} />
              </div>
              <div className="modal-body p-4 text-center">
                <p className="text-secondary small mb-3">
                  Please review your attempt summary before final submission. Once submitted, your answers will be locked for grading.
                </p>

                <div className="row g-2 mb-4">
                  <div className="col-6">
                    <div className="p-3 bg-success-subtle rounded-3 text-success">
                      <h4 className="fw-bold mb-0">{answeredCount + answeredAndMarkedCount}</h4>
                      <small className="fw-semibold">Total Answered</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-danger-subtle rounded-3 text-danger">
                      <h4 className="fw-bold mb-0">{visitedUnansweredCount + notVisitedCount}</h4>
                      <small className="fw-semibold">Unanswered</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-warning-subtle rounded-3 text-warning-emphasis">
                      <h4 className="fw-bold mb-0">{markedReviewCount}</h4>
                      <small className="fw-semibold">Marked for Review</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-light rounded-3 text-secondary">
                      <h4 className="fw-bold mb-0">{formatTime(secondsRemaining)}</h4>
                      <small className="fw-semibold">Time Remaining</small>
                    </div>
                  </div>
                </div>

                <div className="alert alert-warning border-0 small d-flex align-items-center gap-2 text-start">
                  <AlertTriangle size={18} />
                  <div>Are you sure you want to end your test session?</div>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSubmitModal(false)}>
                  Resume Exam
                </button>
                <button
                  type="button"
                  className="btn btn-success fw-bold px-4"
                  onClick={() => handleFinalSubmit(false)}
                >
                  Yes, Submit My Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ANTI-CHEAT TAB SWITCH WARNING MODAL */}
      {showTabWarning && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-body p-4 text-center">
                <ShieldAlert size={48} className="text-danger mx-auto mb-2" />
                <h5 className="fw-bold text-dark">Warning: Window Focus Lost!</h5>
                <p className="text-secondary small mb-3">
                  You have switched tabs or minimized the examination window (Warning {tabSwitchCount} of {exam.tabSwitchLimit || 3}).
                  This event has been logged to your examination audit trail.
                </p>
                <button
                  type="button"
                  className="btn btn-primary px-4 fw-semibold rounded-3"
                  onClick={() => setShowTabWarning(false)}
                >
                  I Understand, Return to Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

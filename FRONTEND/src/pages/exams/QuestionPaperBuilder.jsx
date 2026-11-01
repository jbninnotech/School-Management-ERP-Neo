import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Save,
  Send,
  Eye,
  Database,
  Wand2,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function QuestionPaperBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [exam, setExam] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Modals
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewShowKeys, setPreviewShowKeys] = useState(false);

  // Bulk Import with Preview State
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Bank search & selection
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState([]);

  // Blueprint parameters
  const [blueprintConfig, setBlueprintConfig] = useState({
    totalQuestions: 10,
    easyPercentage: 30,
    mediumPercentage: 50,
    hardPercentage: 20,
  });

  // Question Form State
  const initialQuestionState = {
    questionText: '',
    questionType: 'single_mcq',
    difficulty: 'medium',
    marks: 2,
    negativeMarks: 0.5,
    instructionText: '',
    passageText: '',
    imageUrl: '',
    options: [
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ],
    matchPairs: [
      { id: 'mp_1', left: '', right: '' },
      { id: 'mp_2', left: '', right: '' },
    ],
    correctAnswer: 'opt_1',
    numericalTolerance: 0,
    explanation: '',
  };
  const [questionForm, setQuestionForm] = useState(initialQuestionState);

  // Fetch Exam Data
  const fetchExamData = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/exams/${id}`);
      const data = res.data?.data;
      setExam(data);

      if (data?.examSections && data.examSections.length > 0) {
        setSections(data.examSections);
      } else {
        // Default section if none exists
        setSections([
          {
            id: 'sec_1',
            title: 'Section A - Objective Questions',
            description: 'Multiple choice, True/False, and Assertion-Reasoning',
            durationMinutes: 0,
            totalMarks: data?.totalMarks || 100,
            questions: [],
          },
        ]);
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Failed to load examination',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, [id]);

  // Calculations
  const calculatedTotalMarks = sections.reduce(
    (acc, sec) => acc + (sec.questions?.reduce((qAcc, q) => qAcc + (Number(q.marks) || 0), 0) || 0),
    0
  );
  const totalQuestionsCount = sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
  const isMarksMatching = calculatedTotalMarks === (exam?.totalMarks || 0);

  // Section Management
  const handleAddSection = () => {
    const nextChar = String.fromCharCode(65 + sections.length);
    const newSec = {
      id: `sec_${Date.now()}`,
      title: `Section ${nextChar} - Descriptive`,
      description: '',
      durationMinutes: 0,
      totalMarks: 0,
      questions: [],
    };
    setSections([...sections, newSec]);
    setActiveSectionIdx(sections.length);
  };

  const handleDeleteSection = (index) => {
    if (sections.length <= 1) {
      alert('Examination must have at least one section.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this entire section and its questions?')) {
      const updated = sections.filter((_, idx) => idx !== index);
      setSections(updated);
      setActiveSectionIdx(Math.max(0, index - 1));
    }
  };

  const handleUpdateSectionMeta = (field, val) => {
    const updated = [...sections];
    updated[activeSectionIdx][field] = val;
    setSections(updated);
  };

  // Question Form handlers
  const handleOpenAddQuestion = () => {
    setEditingQuestionIdx(null);
    setQuestionForm({
      ...initialQuestionState,
      marks: exam?.defaultNegativeMarks ? 2 : 1,
      negativeMarks: exam?.negativeMarkingEnabled ? exam?.defaultNegativeMarks || 0.5 : 0,
    });
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (qIdx) => {
    const q = sections[activeSectionIdx].questions[qIdx];
    setEditingQuestionIdx(qIdx);
    setQuestionForm({
      ...initialQuestionState,
      ...q,
      options: q.options && q.options.length ? q.options : initialQuestionState.options,
      matchPairs: q.matchPairs && q.matchPairs.length ? q.matchPairs : initialQuestionState.matchPairs,
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestionToSection = () => {
    if (!questionForm.questionText.trim()) {
      alert('Please enter question text');
      return;
    }

    const updatedSections = [...sections];
    const currentQuestions = [...updatedSections[activeSectionIdx].questions];

    if (editingQuestionIdx !== null) {
      currentQuestions[editingQuestionIdx] = { ...questionForm };
    } else {
      currentQuestions.push({
        ...questionForm,
        order: currentQuestions.length + 1,
      });
    }

    updatedSections[activeSectionIdx].questions = currentQuestions;
    setSections(updatedSections);
    setShowQuestionModal(false);
  };

  const handleDeleteQuestion = (qIdx) => {
    const updatedSections = [...sections];
    updatedSections[activeSectionIdx].questions = updatedSections[activeSectionIdx].questions.filter(
      (_, idx) => idx !== qIdx
    );
    setSections(updatedSections);
  };

  const handleDuplicateQuestion = (qIdx) => {
    const q = sections[activeSectionIdx].questions[qIdx];
    const copy = { ...q, questionText: `${q.questionText} (Copy)` };
    const updatedSections = [...sections];
    updatedSections[activeSectionIdx].questions.splice(qIdx + 1, 0, copy);
    setSections(updatedSections);
  };

  const handleMoveQuestion = (qIdx, dir) => {
    const targetIdx = qIdx + dir;
    const questions = [...sections[activeSectionIdx].questions];
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const temp = questions[qIdx];
    questions[qIdx] = questions[targetIdx];
    questions[targetIdx] = temp;
    const updatedSections = [...sections];
    updatedSections[activeSectionIdx].questions = questions;
    setSections(updatedSections);
  };

  // Option / Match helpers in form
  const handleOptionChange = (idx, text) => {
    const opts = [...questionForm.options];
    opts[idx].text = text;
    setQuestionForm({ ...questionForm, options: opts });
  };

  const handleAddOption = () => {
    const id = `opt_${questionForm.options.length + 1}`;
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { id, text: '' }],
    });
  };

  const handleRemoveOption = (idx) => {
    if (questionForm.options.length <= 2) return;
    const opts = questionForm.options.filter((_, i) => i !== idx);
    setQuestionForm({ ...questionForm, options: opts });
  };

  // Reusable Question Bank Loader
  const handleOpenBankModal = async () => {
    setShowBankModal(true);
    setBankLoading(true);
    setSelectedBankIds([]);
    try {
      const res = await API.get(
        `/questions?classGrade=${encodeURIComponent(exam.classGrade)}&subject=${encodeURIComponent(exam.subject)}`
      );
      setBankQuestions(res.data?.data || []);
    } catch (err) {
      alert('Failed to load Question Bank: ' + err.message);
    } finally {
      setBankLoading(false);
    }
  };

  const handleInsertSelectedFromBank = () => {
    const selected = bankQuestions.filter((q) => selectedBankIds.includes(q._id));
    const updatedSections = [...sections];
    const formatted = selected.map((q) => ({
      questionId: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficulty: q.difficulty,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      numericalTolerance: q.numericalTolerance,
      matchPairs: q.matchPairs,
      passageText: q.passageText,
      imageUrl: q.imageUrl,
    }));

    updatedSections[activeSectionIdx].questions = [
      ...updatedSections[activeSectionIdx].questions,
      ...formatted,
    ];
    setSections(updatedSections);
    setShowBankModal(false);
  };

  // Blueprint Auto-Generate
  const handleBlueprintGenerate = async () => {
    try {
      setSaving(true);
      const res = await API.post('/questions/blueprint-generate', {
        classGrade: exam.classGrade,
        subject: exam.subject,
        ...blueprintConfig,
      });

      const selected = res.data?.data || [];
      if (selected.length === 0) {
        alert('No approved questions found in bank matching this criteria.');
        return;
      }

      const updatedSections = [...sections];
      const formatted = selected.map((q) => ({
        questionId: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        numericalTolerance: q.numericalTolerance,
        matchPairs: q.matchPairs,
        passageText: q.passageText,
      }));

      updatedSections[activeSectionIdx].questions = [
        ...updatedSections[activeSectionIdx].questions,
        ...formatted,
      ];
      setSections(updatedSections);
      setShowBlueprintModal(false);
      setAlert({
        type: 'success',
        message: `Blueprint generated: ${formatted.length} questions populated into active section!`,
      });
    } catch (err) {
      alert('Blueprint generation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Save Paper to Backend
  const handleSaveQuestionPaper = async (shouldSubmitReview = false) => {
    setSaving(true);
    setAlert({ type: '', message: '' });
    try {
      const res = await API.put(`/exams/${id}/paper`, {
        examSections: sections,
        totalMarks: calculatedTotalMarks,
      });

      if (shouldSubmitReview) {
        await API.put(`/exams/${id}/submit-review`);
        setAlert({
          type: 'success',
          message: 'Question paper saved and submitted for Principal review!',
        });
        setTimeout(() => navigate('/exams'), 1500);
      } else {
        setAlert({
          type: 'success',
          message: 'Question paper saved successfully in draft!',
        });
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Failed to save question paper',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Sidebar user={currentUser} />
        <main style={{ marginLeft: '260px', padding: '60px', textAlign: 'center' }}>
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading Question Paper Canvas...</p>
        </main>
      </div>
    );
  }

  const activeSec = sections[activeSectionIdx] || sections[0];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '24px 32px' }}>

        {/* Top Sticky Header */}
        <div className="bg-white p-3 rounded-4 shadow-sm mb-4 border d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-light text-dark border font-monospace">{exam?.examCode}</span>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                {exam?.classGrade} • {exam?.subject}
              </span>
              <span className="badge bg-secondary-subtle text-secondary text-uppercase">{exam?.status}</span>
            </div>
            <h4 className="fw-bold mb-0 text-dark">{exam?.title}</h4>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button className="btn btn-outline-dark btn-sm rounded-3 d-flex align-items-center gap-1" onClick={() => setShowPreviewModal(true)}>
              <Eye size={15} /> Official Preview
            </button>
            <button
              className="btn btn-outline-primary btn-sm rounded-3 d-flex align-items-center gap-1"
              onClick={() => handleSaveQuestionPaper(false)}
              disabled={saving}
            >
              <Save size={15} /> Save Draft
            </button>
            <button
              className="btn btn-success btn-sm rounded-3 d-flex align-items-center gap-1 shadow-sm px-3"
              onClick={() => handleSaveQuestionPaper(true)}
              disabled={saving || totalQuestionsCount === 0}
            >
              <Send size={15} /> Submit for Approval
            </button>
          </div>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex align-items-center justify-content-between mb-4`}>
            <div>{alert.message}</div>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        {/* Blueprint Total Validator Bar */}
        <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex flex-wrap gap-4 text-dark small fw-semibold">
              <div>
                Total Questions: <span className="badge bg-primary">{totalQuestionsCount}</span>
              </div>
              <div>
                Calculated Marks:{' '}
                <span className={`badge ${isMarksMatching ? 'bg-success' : 'bg-danger'}`}>
                  {calculatedTotalMarks} / {exam?.totalMarks} Marks
                </span>
              </div>
              <div>
                Configured Duration: <span className="badge bg-secondary">{exam?.durationMinutes} Mins</span>
              </div>
            </div>

            {!isMarksMatching && (
              <div className="text-danger small d-flex align-items-center gap-1">
                <AlertCircle size={15} />
                <span>
                  Blueprint Mismatch: Configured total is <strong>{exam?.totalMarks}</strong>, but current questions sum to{' '}
                  <strong>{calculatedTotalMarks}</strong>.
                </span>
              </div>
            )}
            {isMarksMatching && (
              <div className="text-success small d-flex align-items-center gap-1">
                <CheckCircle2 size={15} />
                <span>Blueprint Balanced: Questions and marks exactly match configured exam total.</span>
              </div>
            )}
          </div>
        </div>

        {/* Section Tabs and Actions */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div className="d-flex flex-wrap gap-2">
            {sections.map((sec, idx) => (
              <button
                key={sec.id || idx}
                className={`btn btn-sm rounded-3 fw-semibold px-3 py-2 ${
                  activeSectionIdx === idx
                    ? 'btn-primary shadow-sm'
                    : 'btn-white bg-white text-secondary border'
                }`}
                onClick={() => setActiveSectionIdx(idx)}
              >
                {sec.title} ({sec.questions?.length || 0})
              </button>
            ))}
            <button className="btn btn-outline-primary btn-sm rounded-3 d-flex align-items-center gap-1" onClick={handleAddSection}>
              <Plus size={14} /> Add Section
            </button>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-outline-secondary btn-sm rounded-3 d-flex align-items-center gap-1" onClick={handleOpenBankModal}>
              <Database size={14} className="text-primary" /> Insert from Question Bank
            </button>
            <button className="btn btn-outline-secondary btn-sm rounded-3 d-flex align-items-center gap-1" onClick={() => setShowBlueprintModal(true)}>
              <Wand2 size={14} className="text-warning" /> Auto-Blueprint
            </button>
            <button className="btn btn-outline-secondary btn-sm rounded-3 d-flex align-items-center gap-1" onClick={() => setShowImportModal(true)}>
              <Upload size={14} className="text-info" /> Import CSV/JSON
            </button>
            <button
              className="btn btn-primary btn-sm rounded-3 d-flex align-items-center gap-1 px-3 shadow-sm"
              style={{ backgroundColor: '#2563eb' }}
              onClick={handleOpenAddQuestion}
            >
              <Plus size={15} /> Add Question
            </button>
          </div>
        </div>

        {/* Active Section Settings Accordion / Card */}
        <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <label className="form-label small fw-semibold text-secondary mb-1">Section Title</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={activeSec?.title || ''}
                onChange={(e) => handleUpdateSectionMeta('title', e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label small fw-semibold text-secondary mb-1">Section Description / Scope</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. All questions carry 2 marks each"
                value={activeSec?.description || ''}
                onChange={(e) => handleUpdateSectionMeta('description', e.target.value)}
              />
            </div>
            <div className="col-md-2 text-end pt-3">
              <button
                className="btn btn-outline-danger btn-sm rounded-3"
                onClick={() => handleDeleteSection(activeSectionIdx)}
                disabled={sections.length <= 1}
              >
                <Trash2 size={14} /> Remove Section
              </button>
            </div>
          </div>
        </div>

        {/* Question Cards List */}
        {activeSec?.questions?.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <HelpCircle size={44} className="text-secondary opacity-50 mx-auto mb-2" />
            <h6 className="fw-semibold text-dark">No questions in this section yet</h6>
            <p className="text-muted small mb-3">
              Create a custom question, insert approved questions from your bank, or use the auto-blueprint generator.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button className="btn btn-primary btn-sm rounded-3 px-3" onClick={handleOpenAddQuestion}>
                <Plus size={14} className="me-1 inline" /> Create Question
              </button>
              <button className="btn btn-outline-secondary btn-sm rounded-3 px-3" onClick={handleOpenBankModal}>
                <Database size={14} className="me-1 inline" /> From Question Bank
              </button>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {activeSec.questions.map((q, qIdx) => (
              <div key={qIdx} className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-dark border fw-bold">Q{qIdx + 1}</span>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase">
                      {q.questionType?.replace('_', ' ')}
                    </span>
                    <span className="badge bg-secondary-subtle text-secondary">{q.difficulty}</span>
                    <span className="badge bg-success-subtle text-success">+{q.marks} Marks</span>
                    {q.negativeMarks > 0 && (
                      <span className="badge bg-danger-subtle text-danger">-{q.negativeMarks} Neg</span>
                    )}
                  </div>

                  {/* Move & Actions */}
                  <div className="d-flex align-items-center gap-1">
                    <button
                      className="btn btn-light btn-sm p-1"
                      onClick={() => handleMoveQuestion(qIdx, -1)}
                      disabled={qIdx === 0}
                      title="Move Up"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="btn btn-light btn-sm p-1"
                      onClick={() => handleMoveQuestion(qIdx, 1)}
                      disabled={qIdx === activeSec.questions.length - 1}
                      title="Move Down"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="btn btn-light btn-sm p-1 text-secondary"
                      onClick={() => handleDuplicateQuestion(qIdx)}
                      title="Duplicate"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="btn btn-light btn-sm p-1 text-primary"
                      onClick={() => handleOpenEditQuestion(qIdx)}
                      title="Edit Question"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-light btn-sm p-1 text-danger"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      title="Delete Question"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="mt-3">
                  <p className="fw-semibold text-dark mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {q.questionText}
                  </p>

                  {/* Options display for MCQs */}
                  {['single_mcq', 'multiple_select', 'assertion_reason'].includes(q.questionType) && q.options && (
                    <div className="row g-2 mt-1 ps-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = Array.isArray(q.correctAnswer)
                          ? q.correctAnswer.includes(opt.id)
                          : q.correctAnswer === opt.id;
                        return (
                          <div key={opt.id || optIdx} className="col-md-6">
                            <div
                              className={`p-2 rounded-3 border small d-flex align-items-center gap-2 ${
                                isCorrect ? 'bg-success-subtle border-success text-success fw-semibold' : 'bg-light text-secondary'
                              }`}
                            >
                              <span className="font-monospace fw-bold">{String.fromCharCode(65 + optIdx)}.</span>
                              <span>{opt.text}</span>
                              {isCorrect && <CheckCircle2 size={14} className="ms-auto" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False display */}
                  {q.questionType === 'true_false' && (
                    <div className="mt-2 small text-secondary">
                      Correct Key: <strong className="text-success">{String(q.correctAnswer).toUpperCase()}</strong>
                    </div>
                  )}

                  {/* Match pairs display */}
                  {q.questionType === 'match_following' && q.matchPairs && (
                    <div className="mt-2 bg-light p-2 rounded-3 small">
                      <div className="row fw-semibold text-secondary mb-1">
                        <div className="col-6">Item Column</div>
                        <div className="col-6">Matching Column</div>
                      </div>
                      {q.matchPairs.map((p, pIdx) => (
                        <div key={pIdx} className="row text-dark py-1 border-bottom border-light">
                          <div className="col-6">{p.left}</div>
                          <div className="col-6 text-primary">{p.right}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Numerical display */}
                  {q.questionType === 'numerical' && (
                    <div className="mt-2 small text-secondary">
                      Target Value: <strong className="text-primary font-monospace">{q.correctAnswer}</strong> (Tolerance: ±{q.numericalTolerance || 0})
                    </div>
                  )}

                  {/* Fill in Blanks */}
                  {['fill_blanks', 'one_word'].includes(q.questionType) && (
                    <div className="mt-2 small text-secondary">
                      Accepted Answers:{' '}
                      <strong className="text-success font-monospace">
                        {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                      </strong>
                    </div>
                  )}

                  {/* Descriptive answer rubric */}
                  {['short_answer', 'long_answer', 'case_study'].includes(q.questionType) && q.correctAnswer && (
                    <div className="mt-2 p-2 rounded-3 bg-light border-start border-3 border-info small">
                      <span className="text-muted fw-semibold">Suggested Answer Key / Scoring Rubric: </span>
                      <span className="text-dark">{q.correctAnswer}</span>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-2 text-muted small fst-italic">
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: CREATE / EDIT QUESTION (Supports 14 Question Types)   */}
        {/* ------------------------------------------------------------- */}
        {showQuestionModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">
                    {editingQuestionIdx !== null ? 'Edit Question' : 'Create New Question'}
                  </h5>
                  <button className="btn-close" onClick={() => setShowQuestionModal(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    
                    {/* Question Type Selector */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Question Type *</label>
                      <select
                        className="form-select form-select-sm"
                        value={questionForm.questionType}
                        onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                      >
                        <option value="single_mcq">Single-answer Multiple Choice (MCQ)</option>
                        <option value="multiple_select">Multiple Select Questions</option>
                        <option value="true_false">True / False</option>
                        <option value="fill_blanks">Fill in the Blanks</option>
                        <option value="one_word">One-Word Answer</option>
                        <option value="short_answer">Short-Answer Question</option>
                        <option value="long_answer">Long-Answer Question</option>
                        <option value="match_following">Match the Following</option>
                        <option value="image_based">Image-Based Question</option>
                        <option value="passage_based">Passage-Based / Comprehension</option>
                        <option value="numerical">Numerical Answer (with Tolerance)</option>
                        <option value="diagram_based">Diagram-Based Question</option>
                        <option value="case_study">Case-Study Question</option>
                        <option value="assertion_reason">Assertion and Reason</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label small fw-semibold text-secondary">Difficulty Level</label>
                      <select
                        className="form-select form-select-sm"
                        value={questionForm.difficulty}
                        onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label small fw-semibold text-secondary">Marks Awarded *</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min="0.5"
                        step="0.5"
                        value={questionForm.marks}
                        onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })}
                      />
                    </div>

                    {/* Passage text if passage or case study */}
                    {['passage_based', 'case_study'].includes(questionForm.questionType) && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Reading Passage / Case Study Context</label>
                        <textarea
                          rows="4"
                          className="form-control"
                          placeholder="Paste reference reading passage or case study scenario here..."
                          value={questionForm.passageText}
                          onChange={(e) => setQuestionForm({ ...questionForm, passageText: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Question text */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Question Text *</label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Type question stem clearly..."
                        value={questionForm.questionText}
                        onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                        required
                      />
                    </div>

                    {/* Diagram or Image URL */}
                    {['image_based', 'diagram_based'].includes(questionForm.questionType) && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Image / Diagram Attachment URL</label>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          placeholder="https://res.cloudinary.com/... or public image link"
                          value={questionForm.imageUrl}
                          onChange={(e) => setQuestionForm({ ...questionForm, imageUrl: e.target.value })}
                        />
                      </div>
                    )}

                    {/* OPTIONS EDITOR FOR MCQ & ASSERTION-REASON */}
                    {['single_mcq', 'multiple_select', 'assertion_reason'].includes(questionForm.questionType) && (
                      <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-semibold text-secondary mb-0">Answer Options & Correct Answer Key</label>
                          <button type="button" className="btn btn-outline-primary btn-sm py-0 px-2" onClick={handleAddOption}>
                            + Add Option
                          </button>
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {questionForm.options.map((opt, optIdx) => (
                            <div key={opt.id || optIdx} className="input-group input-group-sm">
                              <span className="input-group-text font-monospace bg-light">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                                value={opt.text}
                                onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                              />
                              <span className="input-group-text bg-white">
                                {questionForm.questionType === 'multiple_select' ? (
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0"
                                    checked={Array.isArray(questionForm.correctAnswer) && questionForm.correctAnswer.includes(opt.id)}
                                    onChange={(e) => {
                                      const current = Array.isArray(questionForm.correctAnswer) ? [...questionForm.correctAnswer] : [];
                                      const updated = e.target.checked
                                        ? [...current, opt.id]
                                        : current.filter((id) => id !== opt.id);
                                      setQuestionForm({ ...questionForm, correctAnswer: updated });
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="radio"
                                    className="form-check-input mt-0"
                                    name="correctOptRadio"
                                    checked={questionForm.correctAnswer === opt.id}
                                    onChange={() => setQuestionForm({ ...questionForm, correctAnswer: opt.id })}
                                  />
                                )}
                                <span className="ms-1 small text-muted">Correct Key</span>
                              </span>
                              {questionForm.options.length > 2 && (
                                <button className="btn btn-outline-danger" type="button" onClick={() => handleRemoveOption(optIdx)}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TRUE / FALSE SELECTOR */}
                    {questionForm.questionType === 'true_false' && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Correct Answer Key</label>
                        <div className="d-flex gap-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="tfCorrect"
                              id="tfTrue"
                              checked={questionForm.correctAnswer === true || questionForm.correctAnswer === 'true'}
                              onChange={() => setQuestionForm({ ...questionForm, correctAnswer: true })}
                            />
                            <label className="form-check-label" htmlFor="tfTrue">True</label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="tfCorrect"
                              id="tfFalse"
                              checked={questionForm.correctAnswer === false || questionForm.correctAnswer === 'false'}
                              onChange={() => setQuestionForm({ ...questionForm, correctAnswer: false })}
                            />
                            <label className="form-check-label" htmlFor="tfFalse">False</label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NUMERICAL INPUT */}
                    {questionForm.questionType === 'numerical' && (
                      <>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Correct Numerical Value *</label>
                          <input
                            type="number"
                            step="any"
                            className="form-control form-control-sm font-monospace"
                            placeholder="e.g. 44"
                            value={questionForm.correctAnswer}
                            onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: Number(e.target.value) })}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-secondary">Acceptable Margin / Tolerance (±)</label>
                          <input
                            type="number"
                            step="any"
                            className="form-control form-control-sm font-monospace"
                            placeholder="e.g. 0.05"
                            value={questionForm.numericalTolerance}
                            onChange={(e) => setQuestionForm({ ...questionForm, numericalTolerance: Number(e.target.value) })}
                          />
                        </div>
                      </>
                    )}

                    {/* FILL IN BLANKS / ONE WORD */}
                    {['fill_blanks', 'one_word'].includes(questionForm.questionType) && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Accepted Correct Answers (Comma separated)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. 1, one"
                          value={Array.isArray(questionForm.correctAnswer) ? questionForm.correctAnswer.join(', ') : questionForm.correctAnswer}
                          onChange={(e) => setQuestionForm({
                            ...questionForm,
                            correctAnswer: e.target.value.split(',').map((s) => s.trim()),
                          })}
                        />
                      </div>
                    )}

                    {/* DESCRIPTIVE SHORT / LONG RUBRIC */}
                    {['short_answer', 'long_answer'].includes(questionForm.questionType) && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Teacher Marking Rubric / Key Steps</label>
                        <textarea
                          rows="3"
                          className="form-control form-control-sm"
                          placeholder="List key points or solution steps expected from candidate for full marks..."
                          value={typeof questionForm.correctAnswer === 'string' ? questionForm.correctAnswer : ''}
                          onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Explanation / Solution Notes (Released with results)</label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm"
                        placeholder="Detailed derivation or rationale..."
                        value={questionForm.explanation}
                        onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      />
                    </div>

                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowQuestionModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveQuestionToSection}>
                    Save Question to Section
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: REUSABLE QUESTION BANK SELECTION                      */}
        {/* ------------------------------------------------------------- */}
        {showBankModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Select from Reusable Question Bank</h5>
                    <small className="text-muted">Filtered for {exam.classGrade} • {exam.subject}</small>
                  </div>
                  <button className="btn-close" onClick={() => setShowBankModal(false)} />
                </div>
                <div className="modal-body p-4">
                  {bankLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                      <p className="mt-2 text-muted">Retrieving approved questions from repository...</p>
                    </div>
                  ) : bankQuestions.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <Database size={36} className="mx-auto mb-2 opacity-50" />
                      <p>No questions found in bank for {exam.classGrade} - {exam.subject}.</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {bankQuestions.map((bq) => {
                        const isSelected = selectedBankIds.includes(bq._id);
                        return (
                          <div
                            key={bq._id}
                            className={`p-3 rounded-3 border transition-all cursor-pointer ${
                              isSelected ? 'bg-primary-subtle border-primary' : 'bg-white'
                            }`}
                            onClick={() => {
                              setSelectedBankIds((prev) =>
                                isSelected ? prev.filter((id) => id !== bq._id) : [...prev, bq._id]
                              );
                            }}
                          >
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isSelected}
                                onChange={() => {}}
                              />
                              <span className="badge bg-light text-dark border text-uppercase">{bq.questionType?.replace('_', ' ')}</span>
                              <span className="badge bg-secondary-subtle text-secondary">{bq.difficulty}</span>
                              <span className="badge bg-success-subtle text-success">+{bq.marks} M</span>
                              <span className="text-muted small ms-auto">{bq.chapter}</span>
                            </div>
                            <div className="small fw-semibold text-dark">{bq.questionText}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top d-flex justify-content-between">
                  <span className="small text-muted">{selectedBankIds.length} question(s) selected</span>
                  <div>
                    <button type="button" className="btn btn-outline-secondary me-2" onClick={() => setShowBankModal(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleInsertSelectedFromBank}
                      disabled={selectedBankIds.length === 0}
                    >
                      Insert Selected ({selectedBankIds.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 3: AUTO-BLUEPRINT GENERATOR                              */}
        {/* ------------------------------------------------------------- */}
        {showBlueprintModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">Auto-Generate Paper from Blueprint</h5>
                  <button className="btn-close" onClick={() => setShowBlueprintModal(false)} />
                </div>
                <div className="modal-body p-4">
                  <p className="small text-muted mb-3">
                    Automatically selects and balances approved questions from the Question Bank based on difficulty distribution.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-secondary">Number of Questions to Select</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={blueprintConfig.totalQuestions}
                      onChange={(e) => setBlueprintConfig({ ...blueprintConfig, totalQuestions: Number(e.target.value) })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="form-label small text-secondary">Easy (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={blueprintConfig.easyPercentage}
                        onChange={(e) => setBlueprintConfig({ ...blueprintConfig, easyPercentage: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small text-secondary">Medium (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={blueprintConfig.mediumPercentage}
                        onChange={(e) => setBlueprintConfig({ ...blueprintConfig, mediumPercentage: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small text-secondary">Hard (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={blueprintConfig.hardPercentage}
                        onChange={(e) => setBlueprintConfig({ ...blueprintConfig, hardPercentage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowBlueprintModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning fw-semibold" onClick={handleBlueprintGenerate}>
                    <Wand2 size={15} className="me-1 inline" /> Generate Blueprint
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 4: UNIVERSAL BULK IMPORT WITH LIVE PREVIEW TABLE         */}
        {/* ------------------------------------------------------------- */}
        {showImportModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom bg-light">
                  <div className="d-flex align-items-center gap-2">
                    <Upload size={20} className="text-primary" />
                    <h5 className="modal-title fw-bold text-dark mb-0">Import Questions from Document / Sheet</h5>
                  </div>
                  <button className="btn-close" onClick={() => { setShowImportModal(false); setImportPreviewData(null); }} />
                </div>
                <div className="modal-body p-4">
                  {/* Step 1: Upload & Templates */}
                  {!importPreviewData ? (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="small text-muted">Supports PDF, Excel (.xlsx, .xls), and CSV spreadsheets with automatic Q&A separation.</span>
                        <div className="d-flex gap-2">
                          <a
                            href={`${API.defaults.baseURL || '/api'}/questions/template?format=csv`}
                            download="Question_Import_Template.csv"
                            className="btn btn-outline-secondary btn-sm rounded-3 d-flex align-items-center gap-1"
                          >
                            <Download size={14} /> CSV Template
                          </a>
                          <a
                            href={`${API.defaults.baseURL || '/api'}/questions/template?format=xlsx`}
                            download="Question_Import_Template.xlsx"
                            className="btn btn-outline-secondary btn-sm rounded-3 d-flex align-items-center gap-1"
                          >
                            <Download size={14} /> Excel Template
                          </a>
                        </div>
                      </div>

                      {/* Drag & Drop Zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            setImportFile(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`p-5 border-2 rounded-4 text-center cursor-pointer mb-4 ${
                          isDragOver ? 'border-primary bg-primary-subtle' : 'border-dashed bg-light'
                        }`}
                        style={{ borderStyle: 'dashed' }}
                        onClick={() => document.getElementById('bulk-import-file-input').click()}
                      >
                        <input
                          id="bulk-import-file-input"
                          type="file"
                          accept=".pdf, .csv, .xlsx, .xls, .docx"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setImportFile(e.target.files[0]);
                            }
                          }}
                        />
                        <Upload size={40} className="text-secondary mb-2" />
                        <h6 className="fw-bold text-dark mb-1">
                          {importFile ? importFile.name : 'Click to Browse or Drag & Drop File Here'}
                        </h6>
                        <p className="text-muted small mb-0">PDF (.pdf), Excel (.xlsx, .xls), or CSV (.csv) up to 15MB</p>
                      </div>

                      {importLoading && (
                        <div className="mb-4">
                          <div className="d-flex justify-content-between small text-muted mb-1">
                            <span>Parsing question stems, options, and answer keys...</span>
                            <span>{importProgress}%</span>
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div
                              className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                              role="progressbar"
                              style={{ width: `${importProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="d-flex justify-content-end">
                        <button
                          type="button"
                          className="btn btn-primary rounded-3 px-4"
                          disabled={!importFile || importLoading}
                          onClick={async () => {
                            if (!importFile) return;
                            setImportLoading(true);
                            setImportProgress(35);
                            try {
                              const formData = new FormData();
                              formData.append('file', importFile);
                              formData.append('classGrade', exam?.classGrade || 'Class 10');
                              formData.append('subject', exam?.subject || 'General');

                              setImportProgress(65);
                              const res = await API.post('/questions/import-preview', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              });

                              setImportProgress(100);
                              if (res.data?.success) {
                                setImportPreviewData(res.data);
                              }
                            } catch (err) {
                              window.alert(err.response?.data?.message || err.message || 'Failed to parse file');
                            } finally {
                              setImportLoading(false);
                            }
                          }}
                        >
                          Generate Live Preview
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Live Preview Table */
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex gap-2 align-items-center">
                          <span className="badge bg-primary px-3 py-2">
                            Total Detected: {importPreviewData.totalDetected}
                          </span>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                            Valid: {importPreviewData.validCount}
                          </span>
                          {importPreviewData.errorCount > 0 && (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">
                              Errors / Skipped: {importPreviewData.errorCount}
                            </span>
                          )}
                        </div>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => { setImportPreviewData(null); setImportFile(null); }}
                        >
                          Upload Different File
                        </button>
                      </div>

                      <div className="table-responsive border rounded-3 mb-3" style={{ maxHeight: '420px' }}>
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                          <thead className="table-light sticky-top">
                            <tr>
                              <th style={{ width: '40px' }}>#</th>
                              <th>Question Stem</th>
                              <th>Type</th>
                              <th>Options</th>
                              <th>Correct Key</th>
                              <th>Marks</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreviewData.preview?.map((row, idx) => (
                              <tr key={row.tempId || idx} className={row.hasError ? 'table-danger' : ''}>
                                <td className="text-muted">{idx + 1}</td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={row.questionText}
                                    onChange={(e) => {
                                      const updatedList = [...importPreviewData.preview];
                                      updatedList[idx].questionText = e.target.value;
                                      if (e.target.value.trim().length > 0) {
                                        updatedList[idx].hasError = false;
                                        updatedList[idx].errorReason = '';
                                      }
                                      setImportPreviewData({ ...importPreviewData, preview: updatedList });
                                    }}
                                  />
                                  {row.hasError && (
                                    <span className="badge bg-danger mt-1">{row.errorReason}</span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark border text-uppercase">{row.questionType}</span>
                                </td>
                                <td>
                                  {row.options?.length > 0 ? (
                                    <span className="text-muted">{row.options.length} options</span>
                                  ) : (
                                    <span className="text-muted">Descriptive</span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-success-subtle text-success">{row.correctAnswer}</span>
                                </td>
                                <td style={{ width: '70px' }}>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm text-center"
                                    value={row.marks}
                                    onChange={(e) => {
                                      const updatedList = [...importPreviewData.preview];
                                      updatedList[idx].marks = Number(e.target.value);
                                      setImportPreviewData({ ...importPreviewData, preview: updatedList });
                                    }}
                                  />
                                </td>
                                <td>
                                  {row.hasError ? (
                                    <span className="badge bg-danger">Invalid</span>
                                  ) : (
                                    <span className="badge bg-success">Ready</span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-outline-danger btn-sm p-1"
                                    onClick={() => {
                                      const updatedList = importPreviewData.preview.filter((_, i) => i !== idx);
                                      setImportPreviewData({
                                        ...importPreviewData,
                                        preview: updatedList,
                                        totalDetected: updatedList.length,
                                        validCount: updatedList.filter((q) => !q.hasError).length,
                                        errorCount: updatedList.filter((q) => q.hasError).length,
                                      });
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setShowImportModal(false); setImportPreviewData(null); }}
                  >
                    Cancel
                  </button>
                  {importPreviewData && (
                    <button
                      type="button"
                      className="btn btn-success fw-bold px-4"
                      disabled={importPreviewData.validCount === 0 || importLoading}
                      onClick={async () => {
                        const validToImport = importPreviewData.preview.filter((q) => !q.hasError && q.questionText.trim());
                        if (validToImport.length === 0) return;
                        setImportLoading(true);
                        try {
                          const res = await API.post('/questions/import-confirm', {
                            questions: validToImport,
                            examId: id,
                            sectionId: activeSec.id,
                          });
                          if (res.data?.success) {
                            window.alert(`Successfully imported ${validToImport.length} questions into ${activeSec.title}!`);
                            setShowImportModal(false);
                            setImportPreviewData(null);
                            fetchExamData();
                          }
                        } catch (err) {
                          window.alert(err.response?.data?.message || err.message || 'Failed to confirm questions');
                        } finally {
                          setImportLoading(false);
                        }
                      }}
                    >
                      Confirm & Import to Exam ({importPreviewData.validCount})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 5: OFFICIAL COMPETITIVE EXAMINATION PAPER PREVIEW        */}
        {/* ------------------------------------------------------------- */}
        {showPreviewModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom bg-light">
                  <div className="d-flex align-items-center gap-3">
                    <h5 className="modal-title fw-bold text-dark mb-0">Official Paper Preview</h5>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="toggleAnswerKeys"
                        checked={previewShowKeys}
                        onChange={(e) => setPreviewShowKeys(e.target.checked)}
                      />
                      <label className="form-check-label small fw-semibold text-secondary" htmlFor="toggleAnswerKeys">
                        Show Answer Keys & Solutions
                      </label>
                    </div>
                  </div>
                  <button className="btn-close" onClick={() => setShowPreviewModal(false)} />
                </div>
                <div className="modal-body p-5 bg-white">
                  
                  {/* Institutional Header */}
                  <div className="text-center border-bottom pb-4 mb-4">
                    <h4 className="fw-bold text-dark text-uppercase mb-1">NEO SCHOOL ACADEMIC BOARD</h4>
                    <h5 className="fw-semibold text-secondary mb-1">{exam.title}</h5>
                    <div className="small text-muted font-monospace">
                      EXAM CODE: {exam.examCode} • CLASS: {exam.classGrade} • SUBJECT: {exam.subject}
                    </div>
                    <div className="d-flex justify-content-center gap-4 mt-2 small fw-bold text-dark">
                      <span>TIME ALLOWED: {exam.durationMinutes} MINUTES</span>
                      <span>MAXIMUM MARKS: {calculatedTotalMarks}</span>
                    </div>
                  </div>

                  {/* General Instructions */}
                  <div className="p-3 bg-light rounded-3 mb-4 small">
                    <div className="fw-bold text-uppercase mb-1">General Instructions:</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{exam.instructions}</div>
                  </div>

                  {/* Sections and Questions */}
                  {sections.map((sec, sIdx) => (
                    <div key={sec.id || sIdx} className="mb-5">
                      <div className="bg-light p-2 rounded-2 border-start border-4 border-primary mb-3">
                        <span className="fw-bold text-dark text-uppercase">{sec.title}</span>
                        {sec.description && <span className="text-muted small ms-2">— {sec.description}</span>}
                      </div>

                      <div className="d-flex flex-column gap-3 ps-2">
                        {sec.questions?.map((q, qIdx) => (
                          <div key={qIdx} className="border-bottom pb-3">
                            <div className="d-flex justify-content-between">
                              <span className="fw-bold text-dark">Q{qIdx + 1}.</span>
                              <span className="badge bg-light text-secondary border">[{q.marks} Mark{q.marks > 1 ? 's' : ''}]</span>
                            </div>
                            <div className="mt-1 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                              {q.questionText}
                            </div>

                            {q.imageUrl && (
                              <img src={q.imageUrl} alt="diagram" className="img-fluid rounded my-2" style={{ maxHeight: 200 }} />
                            )}

                            {/* Options */}
                            {['single_mcq', 'multiple_select', 'assertion_reason'].includes(q.questionType) && q.options && (
                              <div className="row g-2 mt-1 ps-2">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="col-md-6 small">
                                    <span className="fw-semibold me-1">({String.fromCharCode(65 + oIdx)})</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {previewShowKeys && (
                              <div className="mt-2 p-2 rounded-2 bg-success-subtle text-success small">
                                <strong>Answer Key: </strong>
                                {Array.isArray(q.correctAnswer) ? JSON.stringify(q.correctAnswer) : String(q.correctAnswer)}
                                {q.explanation && <div className="mt-1 text-muted">Solution: {q.explanation}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                </div>
                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => window.print()}>
                    Print Official Paper
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setShowPreviewModal(false)}>
                    Close Preview
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

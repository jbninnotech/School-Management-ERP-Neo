import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  FileText,
  Clock,
  Award,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export default function CreateExamWizard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    title: '',
    category: 'unit_test',
    academicYear: '2025-2026',
    classGrade: 'Class 10',
    sections: ['A'],
    subject: 'Mathematics Standard',
    description: '',
    instructions: '1. All questions are mandatory.\n2. Do not navigate away from the test tab.\n3. Verify your responses before clicking Submit.',

    // Step 2: Schedule
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    durationMinutes: 90,
    lateStartPolicy: 'allow_with_reduced_time',
    autoSubmitAtDeadline: true,
    resultPublicationMode: 'manual',

    // Step 3: Marks & Evaluation
    totalMarks: 50,
    passingMarks: 20,
    negativeMarkingEnabled: false,
    defaultNegativeMarks: 0.5,
    partialMarkingEnabled: true,
    evaluationMethod: 'hybrid',

    // Step 4: Rules & Controls
    questionNavigation: 'free',
    allowPreviousNavigation: true,
    randomizeQuestionOrder: false,
    randomizeOptionOrder: false,
    questionsPerPage: 1,
    sectionNavigation: 'flexible',
    sectionTimeLimitsEnabled: false,
    calculatorAllowed: false,
    reviewBeforeSubmit: true,
    maxAttempts: 1,
    isPracticeMode: false,
    tabSwitchLimit: 3,
  });

  const stepsMeta = [
    { num: 1, label: 'Basic Info', icon: <FileText size={18} /> },
    { num: 2, label: 'Schedule', icon: <Clock size={18} /> },
    { num: 3, label: 'Scoring', icon: <Award size={18} /> },
    { num: 4, label: 'Security & Rules', icon: <Shield size={18} /> },
  ];

  const availableSections = ['A', 'B', 'C', 'D', 'Science', 'Commerce', 'Humanities'];

  const handleTextChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSectionToggle = (sec) => {
    setFormData((prev) => {
      const exists = prev.sections.includes(sec);
      const updated = exists ? prev.sections.filter((s) => s !== sec) : [...prev.sections, sec];
      return { ...prev, sections: updated.length ? updated : ['A'] };
    });
  };

  const validateStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        setErrorMsg('Please enter an examination title');
        return false;
      }
      if (!formData.subject.trim()) {
        setErrorMsg('Please select or specify a subject');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.examDate) {
        setErrorMsg('Please select an examination date');
        return false;
      }
      if (!formData.startTime || !formData.endTime) {
        setErrorMsg('Please specify both start time and end time');
        return false;
      }
      const startDateTime = new Date(`${formData.examDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.examDate}T${formData.endTime}:00`);
      if (endDateTime <= startDateTime) {
        setErrorMsg('Examination end time must be later than start time');
        return false;
      }
      if (Number(formData.durationMinutes) <= 0) {
        setErrorMsg('Duration must be greater than 0 minutes');
        return false;
      }
    }
    if (currentStep === 3) {
      if (Number(formData.totalMarks) <= 0) {
        setErrorMsg('Total marks must be greater than 0');
        return false;
      }
      if (Number(formData.passingMarks) > Number(formData.totalMarks)) {
        setErrorMsg('Passing marks cannot exceed total marks');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const startDateTime = new Date(`${formData.examDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.examDate}T${formData.endTime}:00`);

      const payload = {
        ...formData,
        startTime: startDateTime,
        endTime: endDateTime,
        totalMarks: Number(formData.totalMarks),
        passingMarks: Number(formData.passingMarks),
        durationMinutes: Number(formData.durationMinutes),
        defaultNegativeMarks: Number(formData.defaultNegativeMarks),
        tabSwitchLimit: Number(formData.tabSwitchLimit),
        maxAttempts: Number(formData.maxAttempts),
      };

      const res = await API.post('/exams', payload);
      if (res.data?.success) {
        const createdExam = res.data.data;
        navigate(`/exams/${createdExam._id}/builder`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create examination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      {/* Responsive Inline CSS */}
      <style>{`
        .wizard-container {
          margin-left: 260px;
          padding: 24px 32px;
          transition: margin 0.25s ease-in-out;
        }
        @media (max-width: 991.98px) {
          .wizard-container {
            margin-left: 0 !important;
            padding: 16px 14px 80px 14px !important;
          }
        }
        .form-check-card {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          border-radius: 12px;
          padding: 14px 16px;
          transition: all 0.15s ease-in-out;
          cursor: pointer;
        }
        .form-check-card:hover {
          border-color: #93c5fd;
          background-color: #f8fafc;
        }
        .interactive-label {
          cursor: pointer;
          user-select: none;
        }
      `}</style>

      <Sidebar user={currentUser} />

      <main className="wizard-container">
        {/* Header Bar */}
        <div
          className="rounded-4 p-3 p-md-4 mb-4"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'inline-flex'
                  }}
                >
                  <Sparkles size={20} />
                </span>
                <h4 className="fw-bold text-dark mb-0 fs-5 fs-md-4">
                  Create Question Paper Blueprint
                </h4>
              </div>
              <p className="text-secondary small mb-0">
                Setup syllabus, examination timing, scoring rubric, and anti-cheating controls
              </p>
            </div>
            <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-2 rounded-pill">
              Step {currentStep} of 4
            </span>
          </div>
        </div>

        {/* Desktop Stepper Bar */}
        <div
          className="d-none d-md-flex align-items-center justify-content-between p-3 rounded-4 mb-4 bg-white border"
          style={{ borderColor: '#e2e8f0' }}
        >
          {stepsMeta.map((s, idx) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  className="d-flex align-items-center gap-2"
                  style={{
                    color: isActive ? '#2563eb' : isCompleted ? '#16a34a' : '#64748b',
                    fontWeight: isActive || isCompleted ? 600 : 500,
                    fontSize: '0.9rem'
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? '#eff6ff' : isCompleted ? '#dcfce7' : '#f1f5f9',
                      color: isActive ? '#2563eb' : isCompleted ? '#16a34a' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isActive ? '2px solid #2563eb' : 'none'
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={18} /> : s.icon}
                  </div>
                  <span>{s.num}. {s.label}</span>
                </div>
                {idx < stepsMeta.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: isCompleted ? '#22c55e' : '#e2e8f0',
                      margin: '0 12px'
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Stepper Bar */}
        <div className="d-block d-md-none mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="fw-bold text-dark small">
              {stepsMeta[currentStep - 1].num}. {stepsMeta[currentStep - 1].label}
            </span>
            <span className="text-muted small">Step {currentStep} / 4</span>
          </div>
          <div className="progress" style={{ height: '6px' }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${(currentStep / 4) * 100}%`,
                backgroundColor: '#2563eb',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="alert alert-danger border-0 rounded-3 mb-4 d-flex align-items-center gap-2 p-3 shadow-sm">
            <AlertCircle size={20} className="flex-shrink-0" />
            <div className="small fw-semibold">{errorMsg}</div>
          </div>
        )}

        {/* Main Step Card */}
        <div
          className="rounded-4 bg-white p-3 p-md-4 mb-4 border"
          style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
        >
          {/* ================= STEP 1: BASIC INFORMATION ================= */}
          {currentStep === 1 && (
            <div>
              <div className="border-bottom pb-3 mb-4">
                <h5 className="fw-bold text-dark mb-1">General Examination Info</h5>
                <p className="text-secondary small mb-0">Specify test name, class syllabus, and recipient sections</p>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <label className="form-label small fw-semibold text-secondary">
                    Examination Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="form-control py-2"
                    placeholder="e.g. CBSE Term-1 Summative Assessment"
                    value={formData.title}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Category *</label>
                  <select
                    name="category"
                    className="form-select py-2"
                    value={formData.category}
                    onChange={handleTextChange}
                  >
                    <option value="unit_test">Unit Test</option>
                    <option value="mid_term">Mid-Term Examination</option>
                    <option value="final">Annual / Final Examination</option>
                    <option value="competitive_mock">Competitive Mock Examination</option>
                    <option value="practice">Practice Assessment</option>
                    <option value="olympiad">Olympiad & Talent Search</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Class / Grade *</label>
                  <select
                    name="classGrade"
                    className="form-select py-2"
                    value={formData.classGrade}
                    onChange={handleTextChange}
                  >
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                    {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    className="form-control py-2"
                    placeholder="e.g. Mathematics Standard"
                    value={formData.subject}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Academic Session</label>
                  <input
                    type="text"
                    name="academicYear"
                    className="form-control py-2"
                    value={formData.academicYear}
                    onChange={handleTextChange}
                  />
                </div>

                {/* Section Multi-Select Pills */}
                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary d-flex align-items-center gap-1">
                    <span>Assign to Sections *</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>(Tap to toggle)</span>
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {availableSections.map((sec) => {
                      const selected = formData.sections.includes(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          className="btn btn-sm px-3 py-2 rounded-pill fw-semibold"
                          style={{
                            backgroundColor: selected ? '#2563eb' : '#f1f5f9',
                            color: selected ? '#ffffff' : '#334155',
                            border: selected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            minHeight: '38px',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleSectionToggle(sec)}
                        >
                          {selected ? `✓ Sec ${sec}` : `+ Sec ${sec}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Description / Syllabus Covered</label>
                  <textarea
                    name="description"
                    rows="2"
                    className="form-control"
                    placeholder="Brief description of chapters and syllabus covered..."
                    value={formData.description}
                    onChange={handleTextChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Candidate Instructions</label>
                  <textarea
                    name="instructions"
                    rows="3"
                    className="form-control font-monospace small"
                    value={formData.instructions}
                    onChange={handleTextChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SCHEDULE & TIMING ================= */}
          {currentStep === 2 && (
            <div>
              <div className="border-bottom pb-3 mb-4">
                <h5 className="fw-bold text-dark mb-1">Exam Window & Time Limits</h5>
                <p className="text-secondary small mb-0">Set the test date, allowed time window, and auto-submission rules</p>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Examination Date *</label>
                  <input
                    type="date"
                    name="examDate"
                    className="form-control py-2"
                    value={formData.examDate}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-6 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    className="form-control py-2"
                    value={formData.startTime}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-6 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    className="form-control py-2"
                    value={formData.endTime}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Duration (in Minutes) *</label>
                  <div className="input-group">
                    <input
                      type="number"
                      name="durationMinutes"
                      className="form-control py-2"
                      min="5"
                      max="360"
                      value={formData.durationMinutes}
                      onChange={handleTextChange}
                      required
                    />
                    <span className="input-group-text bg-light text-muted">Mins</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Candidate's countdown timer will start upon clicking 'Start Test'.
                  </span>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Late-Entry Policy</label>
                  <select
                    name="lateStartPolicy"
                    className="form-select py-2"
                    value={formData.lateStartPolicy}
                    onChange={handleTextChange}
                  >
                    <option value="allow_with_reduced_time">Allow with reduced time (Hard stop at Window End)</option>
                    <option value="allow_with_full_time">Allow full duration anytime within window</option>
                    <option value="disallow_after_15_mins">Strict: Block entry after 15 mins</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Result Release Setting</label>
                  <select
                    name="resultPublicationMode"
                    className="form-select py-2"
                    value={formData.resultPublicationMode}
                    onChange={handleTextChange}
                  >
                    <option value="manual">Manual Publication (Teacher/Admin Approval Required)</option>
                    <option value="immediate">Immediate Scorecard (Published upon submission)</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100 d-flex align-items-center">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="autoSubmitAtDeadline"
                        name="autoSubmitAtDeadline"
                        checked={formData.autoSubmitAtDeadline}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label small fw-semibold text-dark interactive-label"
                        htmlFor="autoSubmitAtDeadline"
                      >
                        Auto-Submit when Countdown Timer Hits 00:00
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: MARKS & EVALUATION ================= */}
          {currentStep === 3 && (
            <div>
              <div className="border-bottom pb-3 mb-4">
                <h5 className="fw-bold text-dark mb-1">Marks & Scoring Architecture</h5>
                <p className="text-secondary small mb-0">Define maximum scores, pass thresholds, and negative marking rules</p>
              </div>

              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Maximum Marks *</label>
                  <input
                    type="number"
                    name="totalMarks"
                    className="form-control py-2 fw-bold text-primary"
                    value={formData.totalMarks}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-6 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Passing Marks *</label>
                  <input
                    type="number"
                    name="passingMarks"
                    className="form-control py-2"
                    value={formData.passingMarks}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Evaluation Mode</label>
                  <select
                    name="evaluationMethod"
                    className="form-select py-2"
                    value={formData.evaluationMethod}
                    onChange={handleTextChange}
                  >
                    <option value="hybrid">Hybrid (Auto MCQs + Teacher Subjective)</option>
                    <option value="automatic">100% Automated (MCQ / Objective only)</option>
                    <option value="manual">Full Manual Teacher Grading</option>
                  </select>
                </div>

                {/* Negative Marking Card */}
                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100">
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="negativeMarkingEnabled"
                        name="negativeMarkingEnabled"
                        checked={formData.negativeMarkingEnabled}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label fw-semibold text-dark small interactive-label"
                        htmlFor="negativeMarkingEnabled"
                      >
                        Enable Negative Marking (Competitive standard)
                      </label>
                    </div>

                    {formData.negativeMarkingEnabled && (
                      <div className="mt-3 ps-4">
                        <label className="form-label small text-secondary">Deduction per incorrect answer</label>
                        <input
                          type="number"
                          step="0.25"
                          name="defaultNegativeMarks"
                          className="form-control form-control-sm"
                          style={{ maxWidth: '140px' }}
                          value={formData.defaultNegativeMarks}
                          onChange={handleTextChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Partial Marking Card */}
                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100">
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="partialMarkingEnabled"
                        name="partialMarkingEnabled"
                        checked={formData.partialMarkingEnabled}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label fw-semibold text-dark small interactive-label"
                        htmlFor="partialMarkingEnabled"
                      >
                        Enable Partial Credit for Multi-Select Questions
                      </label>
                    </div>
                    <p className="text-muted small ps-4 mb-0" style={{ fontSize: '0.78rem' }}>
                      Awards proportional score when student picks partial correct options without any wrong selections.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: RULES & CONTROLS ================= */}
          {currentStep === 4 && (
            <div>
              <div className="border-bottom pb-3 mb-4">
                <h5 className="fw-bold text-dark mb-1">Security & Test Environment</h5>
                <p className="text-secondary small mb-0">Configure question shuffling, tab-switch proctoring, and navigation</p>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Question Navigation</label>
                  <select
                    name="questionNavigation"
                    className="form-select py-2"
                    value={formData.questionNavigation}
                    onChange={handleTextChange}
                  >
                    <option value="free">Free Palette Jump (Students can jump to any question)</option>
                    <option value="linear">Strict Linear (Sequential order only)</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Max Attempts Allowed</label>
                  <input
                    type="number"
                    name="maxAttempts"
                    className="form-control py-2"
                    min="1"
                    max="10"
                    value={formData.maxAttempts}
                    onChange={handleTextChange}
                  />
                </div>

                {/* Anti-Cheating & Randomization Toggles */}
                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="randomizeQuestionOrder"
                        name="randomizeQuestionOrder"
                        checked={formData.randomizeQuestionOrder}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label small fw-semibold text-dark interactive-label"
                        htmlFor="randomizeQuestionOrder"
                      >
                        Randomize Question Order (Per candidate)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="randomizeOptionOrder"
                        name="randomizeOptionOrder"
                        checked={formData.randomizeOptionOrder}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label small fw-semibold text-dark interactive-label"
                        htmlFor="randomizeOptionOrder"
                      >
                        Shuffle MCQ Options (A, B, C, D)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="calculatorAllowed"
                        name="calculatorAllowed"
                        checked={formData.calculatorAllowed}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label small fw-semibold text-dark interactive-label"
                        htmlFor="calculatorAllowed"
                      >
                        Enable On-Screen Scientific Calculator
                      </label>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-check-card h-100">
                    <label className="form-label small fw-semibold text-dark mb-1">
                      Tab-Switch Proctoring Limit
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="number"
                        name="tabSwitchLimit"
                        className="form-control form-control-sm"
                        min="1"
                        max="10"
                        style={{ maxWidth: '100px' }}
                        value={formData.tabSwitchLimit}
                        onChange={handleTextChange}
                      />
                      <span className="text-muted small">warnings before auto-flagging</span>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-check-card">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input ms-0 me-3"
                        type="checkbox"
                        id="isPracticeMode"
                        name="isPracticeMode"
                        checked={formData.isPracticeMode}
                        onChange={handleTextChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        className="form-check-label small fw-semibold text-dark interactive-label"
                        htmlFor="isPracticeMode"
                      >
                        Self-Paced Practice Assessment (Shows immediate answer hints without recording formal gradebook scores)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 border-top pt-4 mt-4">
            {currentStep > 1 ? (
              <button
                type="button"
                className="btn btn-outline-secondary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 px-3 rounded-3"
                onClick={handleBack}
                style={{ minHeight: '44px' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div className="d-none d-sm-block" />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                className="btn btn-primary fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 px-4 rounded-3 shadow-sm"
                onClick={handleNext}
                style={{ backgroundColor: '#2563eb', border: 'none', minHeight: '44px' }}
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 px-4 rounded-3 shadow-sm"
                onClick={handleSubmit}
                disabled={loading}
                style={{ minHeight: '44px' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Creating Blueprint...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Save & Build Questions</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
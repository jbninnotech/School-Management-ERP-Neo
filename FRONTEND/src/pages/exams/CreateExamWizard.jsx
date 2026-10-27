import React, { useState, useEffect } from 'react';
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
  Sliders
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

    // Step 4: Rules & Competitive Engine
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
      if (formData.durationMinutes <= 0) {
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
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      // Calculate start and end ISO timestamps
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
        // Redirect to Question Paper Builder
        navigate(`/exams/${createdExam._id}/builder`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create examination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>

        {/* Header */}
        <div className="mb-4 pb-3 border-bottom">
          <h3 className="fw-bold mb-1 text-dark">Examination Creation Wizard</h3>
          <p className="text-muted small mb-0">
            Configure examination blueprint, schedules, competitive rules, and marking criteria
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
          <div className="row g-2 text-center">
            <div className={`col-3 p-2 rounded-3 ${currentStep === 1 ? 'bg-primary-subtle text-primary fw-bold' : currentStep > 1 ? 'text-success fw-semibold' : 'text-muted'}`}>
              <FileText size={18} className="d-block mx-auto mb-1" />
              <span className="small">1. Basic Information</span>
            </div>
            <div className={`col-3 p-2 rounded-3 ${currentStep === 2 ? 'bg-primary-subtle text-primary fw-bold' : currentStep > 2 ? 'text-success fw-semibold' : 'text-muted'}`}>
              <Clock size={18} className="d-block mx-auto mb-1" />
              <span className="small">2. Schedule & Timing</span>
            </div>
            <div className={`col-3 p-2 rounded-3 ${currentStep === 3 ? 'bg-primary-subtle text-primary fw-bold' : currentStep > 3 ? 'text-success fw-semibold' : 'text-muted'}`}>
              <Award size={18} className="d-block mx-auto mb-1" />
              <span className="small">3. Marks & Evaluation</span>
            </div>
            <div className={`col-3 p-2 rounded-3 ${currentStep === 4 ? 'bg-primary-subtle text-primary fw-bold' : 'text-muted'}`}>
              <Shield size={18} className="d-block mx-auto mb-1" />
              <span className="small">4. Rules & Controls</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="alert alert-danger border-0 rounded-3 mb-4 d-flex align-items-center gap-2">
            <AlertCircle size={18} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Step Card Content */}
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4 p-md-5 mb-4">

          {/* STEP 1: BASIC INFORMATION */}
          {currentStep === 1 && (
            <div>
              <h5 className="fw-bold text-dark mb-4">Step 1: Basic Examination Details</h5>
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label small fw-semibold text-secondary">Examination Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="form-control"
                    placeholder="e.g. CBSE Term-1 Summative Assessment in Mathematics"
                    value={formData.title}
                    onChange={handleTextChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Category *</label>
                  <select name="category" className="form-select" value={formData.category} onChange={handleTextChange}>
                    <option value="unit_test">Unit Test</option>
                    <option value="mid_term">Mid-Term Examination</option>
                    <option value="final">Annual / Final Examination</option>
                    <option value="competitive_mock">Competitive Mock Examination</option>
                    <option value="practice">Practice Assessment</option>
                    <option value="olympiad">Olympiad & Talent Search</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Academic Year</label>
                  <input
                    type="text"
                    name="academicYear"
                    className="form-control"
                    value={formData.academicYear}
                    onChange={handleTextChange}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Class / Grade *</label>
                  <select name="classGrade" className="form-select" value={formData.classGrade} onChange={handleTextChange}>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                    {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    className="form-control"
                    placeholder="e.g. Mathematics Standard"
                    value={formData.subject}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                {/* Multi-Section Selection */}
                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Eligible Sections (Select all that apply) *</label>
                  <div className="d-flex flex-wrap gap-2">
                    {availableSections.map((sec) => {
                      const selected = formData.sections.includes(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          className={`btn btn-sm px-3 py-1 rounded-pill ${selected ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => handleSectionToggle(sec)}
                        >
                          Section {sec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Description / Scope</label>
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

          {/* STEP 2: SCHEDULE & TIMING */}
          {currentStep === 2 && (
            <div>
              <h5 className="fw-bold text-dark mb-4">Step 2: Examination Schedule & Window</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Examination Date *</label>
                  <input
                    type="date"
                    name="examDate"
                    className="form-control"
                    value={formData.examDate}
                    onChange={handleTextChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Window Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    className="form-control"
                    value={formData.startTime}
                    onChange={handleTextChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Window End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    className="form-control"
                    value={formData.endTime}
                    onChange={handleTextChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Exam Duration (Minutes) *</label>
                  <input
                    type="number"
                    name="durationMinutes"
                    className="form-control"
                    min="5"
                    max="360"
                    value={formData.durationMinutes}
                    onChange={handleTextChange}
                    required
                  />
                  <small className="text-muted">Student countdown timer will be locked to this exact duration.</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Late-Start Policy</label>
                  <select name="lateStartPolicy" className="form-select" value={formData.lateStartPolicy} onChange={handleTextChange}>
                    <option value="allow_with_reduced_time">Allow with reduced time (Strict hard stop at end window)</option>
                    <option value="allow_with_full_time">Allow with full duration within window</option>
                    <option value="disallow_after_15_mins">Disallow entry 15 mins after scheduled start</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Result Publication Setting</label>
                  <select name="resultPublicationMode" className="form-select" value={formData.resultPublicationMode} onChange={handleTextChange}>
                    <option value="manual">Manual Publication (Authorized Principal / Teacher approval required)</option>
                    <option value="immediate">Immediate Scorecard (Released as soon as student submits)</option>
                  </select>
                </div>

                <div className="col-md-6 d-flex align-items-center mt-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="autoSubmitAtDeadline"
                      name="autoSubmitAtDeadline"
                      checked={formData.autoSubmitAtDeadline}
                      onChange={handleTextChange}
                    />
                    <label className="form-check-label small fw-semibold text-secondary" htmlFor="autoSubmitAtDeadline">
                      Automatically Submit Answers at Deadline Expiration
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MARKS & EVALUATION */}
          {currentStep === 3 && (
            <div>
              <h5 className="fw-bold text-dark mb-4">Step 3: Marks & Scoring Architecture</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Total Maximum Marks *</label>
                  <input
                    type="number"
                    name="totalMarks"
                    className="form-control fw-bold"
                    value={formData.totalMarks}
                    onChange={handleTextChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Passing Marks *</label>
                  <input
                    type="number"
                    name="passingMarks"
                    className="form-control"
                    value={formData.passingMarks}
                    onChange={handleTextChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Evaluation Mode</label>
                  <select name="evaluationMethod" className="form-select" value={formData.evaluationMethod} onChange={handleTextChange}>
                    <option value="hybrid">Hybrid (Auto-evaluate MCQs + Teacher eval for Subjective)</option>
                    <option value="automatic">100% Automatic (Objective exams only)</option>
                    <option value="manual">Full Manual Evaluation</option>
                  </select>
                </div>

                <div className="col-md-6 mt-3">
                  <div className="card p-3 border rounded-3 bg-light">
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="negativeMarkingEnabled"
                        name="negativeMarkingEnabled"
                        checked={formData.negativeMarkingEnabled}
                        onChange={handleTextChange}
                      />
                      <label className="form-check-label fw-semibold text-dark small" htmlFor="negativeMarkingEnabled">
                        Enable Competitive Negative Marking
                      </label>
                    </div>
                    {formData.negativeMarkingEnabled && (
                      <div className="mt-2">
                        <label className="form-label small text-secondary">Default Deduction per Wrong Answer</label>
                        <input
                          type="number"
                          step="0.25"
                          name="defaultNegativeMarks"
                          className="form-control form-control-sm"
                          value={formData.defaultNegativeMarks}
                          onChange={handleTextChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-6 mt-3">
                  <div className="card p-3 border rounded-3 bg-light">
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="partialMarkingEnabled"
                        name="partialMarkingEnabled"
                        checked={formData.partialMarkingEnabled}
                        onChange={handleTextChange}
                      />
                      <label className="form-check-label fw-semibold text-dark small" htmlFor="partialMarkingEnabled">
                        Enable Partial Marking for Multiple Select & Matchings
                      </label>
                    </div>
                    <small className="text-muted">
                      Awards proportional points if candidate gets a subset of correct options without wrong selections.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RULES & COMPETITIVE CONTROLS */}
          {currentStep === 4 && (
            <div>
              <h5 className="fw-bold text-dark mb-4">Step 4: Examination Security & Rules Engine</h5>
              <div className="row g-4">
                
                {/* Navigation Policy */}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Question Navigation Mode</label>
                  <select name="questionNavigation" className="form-select" value={formData.questionNavigation} onChange={handleTextChange}>
                    <option value="free">Free Palette Jump (Competitive Standard - jump to any question)</option>
                    <option value="linear">Strict Linear (Must answer or skip in fixed order)</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Questions Per Page</label>
                  <select name="questionsPerPage" className="form-select" value={formData.questionsPerPage} onChange={handleTextChange}>
                    <option value="1">1 Question per view (Standard)</option>
                    <option value="5">5 Questions per page</option>
                  </select>
                </div>

                {/* Shuffling & Anti-Cheat */}
                <div className="col-12">
                  <h6 className="fw-bold text-secondary text-uppercase small mb-3">Randomization & Security</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="form-check form-switch p-3 border rounded-3 bg-light">
                        <input
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          id="randomizeQuestionOrder"
                          name="randomizeQuestionOrder"
                          checked={formData.randomizeQuestionOrder}
                          onChange={handleTextChange}
                        />
                        <label className="form-check-label small fw-semibold text-dark" htmlFor="randomizeQuestionOrder">
                          Randomize Question Order per Candidate
                        </label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch p-3 border rounded-3 bg-light">
                        <input
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          id="randomizeOptionOrder"
                          name="randomizeOptionOrder"
                          checked={formData.randomizeOptionOrder}
                          onChange={handleTextChange}
                        />
                        <label className="form-check-label small fw-semibold text-dark" htmlFor="randomizeOptionOrder">
                          Randomize MCQ Options Order (A, B, C, D)
                        </label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch p-3 border rounded-3 bg-light">
                        <input
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          id="calculatorAllowed"
                          name="calculatorAllowed"
                          checked={formData.calculatorAllowed}
                          onChange={handleTextChange}
                        />
                        <label className="form-check-label small fw-semibold text-dark" htmlFor="calculatorAllowed">
                          Allow On-Screen Basic Calculator
                        </label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label small fw-semibold text-dark mb-1">
                          Tab Switch / Focus Lost Warning Limit
                        </label>
                        <input
                          type="number"
                          name="tabSwitchLimit"
                          className="form-control form-control-sm"
                          min="1"
                          max="10"
                          value={formData.tabSwitchLimit}
                          onChange={handleTextChange}
                        />
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Triggers integrity log when candidate switches away from test window.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attempts */}
                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-secondary">Maximum Allowed Attempts</label>
                  <input
                    type="number"
                    name="maxAttempts"
                    className="form-control"
                    min="1"
                    max="5"
                    value={formData.maxAttempts}
                    onChange={handleTextChange}
                  />
                </div>

                <div className="col-md-8 d-flex align-items-center mt-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="isPracticeMode"
                      name="isPracticeMode"
                      checked={formData.isPracticeMode}
                      onChange={handleTextChange}
                    />
                    <label className="form-check-label small fw-semibold text-secondary" htmlFor="isPracticeMode">
                      Practice Mode (Shows immediate answer solutions after attempt without recording official marks)
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="d-flex justify-content-between align-items-center border-top pt-4 mt-4">
            {currentStep > 1 ? (
              <button type="button" className="btn btn-outline-secondary px-4 d-flex align-items-center gap-1" onClick={handleBack}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button type="button" className="btn btn-primary px-4 fw-semibold d-flex align-items-center gap-1" onClick={handleNext}>
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    Creating Examination...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Save & Proceed to Question Builder
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

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar.jsx';
import API from '../../api/api.js';
import {
  Database,
  Plus,
  Search,
  Trash2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function QuestionBank() {
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Class 10');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Add Single Question Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    classGrade: 'Class 10',
    subject: 'Mathematics Standard',
    chapter: '',
    topic: '',
    questionType: 'single_mcq',
    difficulty: 'medium',
    marks: 2,
    negativeMarks: 0.5,
    questionText: '',
    options: [
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
      { id: 'opt_3', text: '' },
      { id: 'opt_4', text: '' },
    ],
    correctAnswer: 'opt_1',
    explanation: '',
  });

  // Bulk Import File Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importClass, setImportClass] = useState('Class 10');
  const [importSubject, setImportSubject] = useState('Mathematics Standard');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = `?classGrade=${encodeURIComponent(selectedClass)}`;
      if (selectedSubject) query += `&subject=${encodeURIComponent(selectedSubject)}`;
      if (selectedDifficulty) query += `&difficulty=${encodeURIComponent(selectedDifficulty)}`;
      if (selectedType) query += `&questionType=${encodeURIComponent(selectedType)}`;
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await API.get(`/questions${query}`);
      setQuestions(res.data?.data || []);
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.response?.data?.message || err.message || 'Failed to load questions',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedClass, selectedSubject, selectedDifficulty, selectedType]);

  const handleCreateQuestion = async () => {
    if (!newQuestion.questionText.trim()) {
      window.alert('Please enter question text');
      return;
    }
    try {
      await API.post('/questions', newQuestion);
      setShowAddModal(false);
      setAlert({ type: 'success', message: 'Question saved to Bank successfully!' });
      fetchQuestions();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Error saving question');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      window.alert('Please select a file to import');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classGrade', importClass);
    formData.append('subject', importSubject);

    setUploading(true);
    try {
      const res = await API.post('/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowImportModal(false);
      setSelectedFile(null);
      setAlert({ type: 'success', message: res.data?.message || 'Questions imported successfully!' });
      fetchQuestions();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Error importing file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (qId) => {
    if (!window.confirm('Archive this question from the Question Bank?')) return;
    try {
      await API.delete(`/questions/${qId}`);
      fetchQuestions();
    } catch (err) {
      window.alert('Failed to archive: ' + err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Sidebar user={currentUser} />
      <main style={{ marginLeft: '260px', padding: '28px 36px' }}>

        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h3 className="fw-bold mb-1 text-dark">Institutional Question Bank</h3>
            <p className="text-muted small mb-0">
              Reusable repository of verified questions for LKG through Class 12
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 rounded-3 shadow-sm bg-white"
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={16} /> Import (PDF / Word / Excel / CSV)
            </button>
            <button
              className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-2 rounded-3 shadow-sm"
              style={{ backgroundColor: '#2563eb' }}
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} /> Add to Question Bank
            </button>
          </div>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type} border-0 rounded-3 shadow-sm d-flex justify-content-between align-items-center mb-4`}>
            <div>{alert.message}</div>
            <button className="btn-close" onClick={() => setAlert({ type: '', message: '' })} />
          </div>
        )}

        {/* Stats */}
        <div className="row g-3 mb-4">
          <div className="col-sm-3">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Total Available Questions</span>
              <h3 className="fw-bold text-primary mb-0">{questions.length}</h3>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Easy Questions</span>
              <h3 className="fw-bold text-success mb-0">{questions.filter((q) => q.difficulty === 'easy').length}</h3>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Medium Questions</span>
              <h3 className="fw-bold text-warning mb-0">{questions.filter((q) => q.difficulty === 'medium').length}</h3>
            </div>
          </div>
          <div className="col-sm-3">
            <div className="card border-0 shadow-sm p-3 rounded-3 bg-white">
              <span className="text-muted small fw-semibold">Hard Questions</span>
              <h3 className="fw-bold text-danger mb-0">{questions.filter((q) => q.difficulty === 'hard').length}</h3>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-secondary mb-1">Class / Grade</label>
              <select className="form-select form-select-sm" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
                {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-secondary mb-1">Question Type</label>
              <select className="form-select form-select-sm" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="">All Question Types</option>
                <option value="single_mcq">Single MCQ</option>
                <option value="multiple_select">Multiple Select</option>
                <option value="true_false">True / False</option>
                <option value="fill_blanks">Fill in Blanks</option>
                <option value="numerical">Numerical</option>
                <option value="short_answer">Short Answer</option>
                <option value="long_answer">Long Answer</option>
                <option value="match_following">Match the Following</option>
                <option value="assertion_reason">Assertion & Reason</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-secondary mb-1">Difficulty</label>
              <select className="form-select form-select-sm" value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-secondary mb-1">Search Keywords</label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Topic, chapter, keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchQuestions()}
                />
                <button className="btn btn-outline-secondary" onClick={fetchQuestions}>
                  <Search size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted small">Loading questions bank...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <Database size={40} className="text-secondary opacity-50 mx-auto mb-2" />
            <h6 className="fw-semibold text-dark">No questions match the current filters</h6>
            <p className="text-muted small mb-0">Try importing a PDF, Word, or Excel document to get started.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {questions.map((q) => (
              <div key={q._id} className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase">
                      {q.questionType?.replace('_', ' ')}
                    </span>
                    <span className={`badge ${q.difficulty === 'easy' ? 'bg-success-subtle text-success' : q.difficulty === 'medium' ? 'bg-warning-subtle text-warning-emphasis' : 'bg-danger-subtle text-danger'}`}>
                      {q.difficulty}
                    </span>
                    <span className="badge bg-light text-dark border">+{q.marks} Marks</span>
                    {q.chapter && <span className="text-muted small">Chapter: {q.chapter}</span>}
                  </div>
                  <button className="btn btn-light btn-sm text-danger p-1" onClick={() => handleDelete(q._id)} title="Archive">
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3">
                  <p className="fw-semibold text-dark mb-2">{q.questionText}</p>

                  {q.options && q.options.length > 0 && (
                    <div className="row g-2 mt-1 ps-2">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = Array.isArray(q.correctAnswer)
                          ? q.correctAnswer.includes(opt.id)
                          : q.correctAnswer === opt.id;
                        return (
                          <div key={opt.id || oIdx} className="col-md-6 small">
                            <span className={`p-1 px-2 rounded-2 border d-block ${isCorrect ? 'bg-success-subtle text-success fw-semibold border-success' : 'bg-light text-secondary'}`}>
                              ({String.fromCharCode(65 + oIdx)}) {opt.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.correctAnswer && !q.options?.length && (
                    <div className="mt-2 small text-secondary">
                      Target Key:{' '}
                      <strong className="text-success font-monospace">
                        {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                      </strong>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-2 small text-muted fst-italic">
                      Solution: {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL 1: Bulk File Import (PDF, DOCX, XLSX, CSV) */}
        {showImportModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <Upload className="text-primary" size={20} />
                    <h5 className="modal-title fw-bold text-dark mb-0">Import Questions from File</h5>
                  </div>
                  <button className="btn-close" onClick={() => setShowImportModal(false)} />
                </div>
                <form onSubmit={handleFileUpload}>
                  <div className="modal-body p-4">
                    <div className="alert alert-info border-0 rounded-3 small mb-3">
                      <strong>Supported Formats:</strong>
                      <ul className="mb-0 mt-1 ps-3">
                        <li><strong>Excel (.xlsx) / CSV:</strong> Columns: <code>QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks</code></li>
                        <li><strong>Word (.docx) / PDF (.pdf):</strong> Numbered format (e.g. <code>1. What is...? A) opt B) opt Ans: A</code>)</li>
                      </ul>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-secondary">Target Class / Grade</label>
                        <select
                          className="form-select form-select-sm"
                          value={importClass}
                          onChange={(e) => setImportClass(e.target.value)}
                        >
                          <option value="LKG">LKG</option>
                          <option value="UKG">UKG</option>
                          {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-secondary">Target Subject</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={importSubject}
                          onChange={(e) => setImportSubject(e.target.value)}
                          required
                        />
                      </div>

                      <div className="col-12 mt-3">
                        <label className="form-label small fw-semibold text-secondary">Select File *</label>
                        <div
                          className="border border-2 border-dashed rounded-3 p-4 text-center bg-light"
                          style={{ cursor: 'pointer' }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".pdf,.docx,.xlsx,.xls,.csv"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                          />
                          <FileSpreadsheet size={36} className="text-secondary opacity-75 mb-2" />
                          <p className="mb-1 fw-semibold text-dark">
                            {selectedFile ? selectedFile.name : 'Click to browse or drop file here'}
                          </p>
                          <span className="text-muted small">
                            {selectedFile
                              ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                              : 'Supports .pdf, .docx, .xlsx, .csv (Max 15MB)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowImportModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile}>
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                          Processing & Importing...
                        </>
                      ) : (
                        'Upload & Import'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Add Single Question Manually */}
        {showAddModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold text-dark">Add New Question to Bank</h5>
                  <button className="btn-close" onClick={() => setShowAddModal(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-secondary">Class / Grade *</label>
                      <select
                        className="form-select form-select-sm"
                        value={newQuestion.classGrade}
                        onChange={(e) => setNewQuestion({ ...newQuestion, classGrade: e.target.value })}
                      >
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
                        className="form-control form-control-sm"
                        value={newQuestion.subject}
                        onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-secondary">Question Type *</label>
                      <select
                        className="form-select form-select-sm"
                        value={newQuestion.questionType}
                        onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                      >
                        <option value="single_mcq">Single MCQ</option>
                        <option value="multiple_select">Multiple Select</option>
                        <option value="true_false">True / False</option>
                        <option value="fill_blanks">Fill in Blanks</option>
                        <option value="numerical">Numerical</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="long_answer">Long Answer</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Chapter</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Real Numbers"
                        value={newQuestion.chapter}
                        onChange={(e) => setNewQuestion({ ...newQuestion, chapter: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold text-secondary">Difficulty</label>
                      <select
                        className="form-select form-select-sm"
                        value={newQuestion.difficulty}
                        onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold text-secondary">Marks</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={newQuestion.marks}
                        onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Question Text *</label>
                      <textarea
                        rows="3"
                        className="form-control form-control-sm"
                        placeholder="Enter the full question stem..."
                        value={newQuestion.questionText}
                        onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                      />
                    </div>

                    {['single_mcq', 'multiple_select'].includes(newQuestion.questionType) && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold text-secondary">Options & Correct Key</label>
                        <div className="d-flex flex-column gap-2">
                          {newQuestion.options.map((opt, idx) => (
                            <div key={idx} className="input-group input-group-sm">
                              <span className="input-group-text font-monospace bg-light">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                                value={opt.text}
                                onChange={(e) => {
                                  const opts = [...newQuestion.options];
                                  opts[idx].text = e.target.value;
                                  setNewQuestion({ ...newQuestion, options: opts });
                                }}
                              />
                              <span className="input-group-text bg-white">
                                <input
                                  type="radio"
                                  className="form-check-input mt-0"
                                  name="bankRadio"
                                  checked={newQuestion.correctAnswer === opt.id}
                                  onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: opt.id })}
                                />
                                <span className="ms-1 small text-muted">Key</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Explanation / Rationale</label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm"
                        value={newQuestion.explanation}
                        onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleCreateQuestion}>
                    Save to Bank
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
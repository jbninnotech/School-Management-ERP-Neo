import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronDown, X, Loader2 } from 'lucide-react';
import API from '../api/api.js';

export default function SearchableSubjectSelect({
  selectedSubject = '',
  classGrade = '',
  onChange,
  required = false,
  placeholder = 'Search & select subject...',
  isMulti = false,
  selectedSubjects = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  // Fetch subjects dynamically from API
  useEffect(() => {
    let isMounted = true;
    const fetchSubjects = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (classGrade) params.classGrade = classGrade;
        const res = await API.get('/academic/subjects', { params });
        if (isMounted) {
          const list = res.data?.data || [];
          setSubjectsList(list);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Fallback: loading default subjects', err);
          // Graceful fallback to default core curriculum
          setSubjectsList([
            { name: 'Mathematics' },
            { name: 'Science' },
            { name: 'English Language & Lit' },
            { name: 'Social Science' },
            { name: 'Physics' },
            { name: 'Chemistry' },
            { name: 'Biology' },
            { name: 'Computer Science' },
            { name: 'Information Technology' },
            { name: 'Hindi' },
            { name: 'Accountancy' },
            { name: 'Business Studies' },
            { name: 'Economics' },
            { name: 'History' },
          ]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSubjects();
    return () => {
      isMounted = false;
    };
  }, [classGrade]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSubjects = subjectsList.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelect = (subjName) => {
    if (isMulti) {
      if (selectedSubjects.includes(subjName)) {
        onChange(selectedSubjects.filter((s) => s !== subjName));
      } else {
        onChange([...selectedSubjects, subjName]);
      }
    } else {
      onChange(subjName);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleRemoveChip = (e, subjName) => {
    e.stopPropagation();
    if (isMulti) {
      onChange(selectedSubjects.filter((s) => s !== subjName));
    }
  };

  return (
    <div className="position-relative w-100" ref={dropdownRef}>
      {/* Trigger Button / Input Display */}
      <div
        className="form-control d-flex align-items-center justify-content-between p-2 cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          minHeight: '38px',
          borderColor: isOpen ? '#3b82f6' : '#cbd5e1',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
        }}
      >
        <div className="d-flex flex-wrap gap-1 align-items-center flex-grow-1 overflow-hidden">
          {isMulti ? (
            selectedSubjects.length > 0 ? (
              selectedSubjects.map((subj) => (
                <span
                  key={subj}
                  className="badge bg-primary text-white d-flex align-items-center gap-1 py-1 px-2"
                  style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                >
                  {subj}
                  <X
                    size={13}
                    className="cursor-pointer"
                    onClick={(e) => handleRemoveChip(e, subj)}
                  />
                </span>
              ))
            ) : (
              <span className="text-muted small">{placeholder}</span>
            )
          ) : selectedSubject ? (
            <span className="fw-medium text-dark small">{selectedSubject}</span>
          ) : (
            <span className="text-muted small">{placeholder}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-1 ms-2">
          {loading && <Loader2 size={14} className="text-muted animate-spin" />}
          <ChevronDown size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="position-absolute start-0 end-0 mt-1 bg-white border rounded shadow-lg overflow-hidden"
          style={{ zIndex: 1060, maxHeight: '280px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search Box */}
          <div className="p-2 border-bottom bg-light">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <Search size={14} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* List options */}
          <div className="overflow-auto flex-grow-1 py-1" style={{ maxHeight: '200px' }}>
            {filteredSubjects.length === 0 ? (
              <div className="p-3 text-center text-muted small">
                {loading ? 'Fetching available subjects...' : 'No matching subjects found.'}
              </div>
            ) : (
              filteredSubjects.map((sub) => {
                const isSelected = isMulti
                  ? selectedSubjects.includes(sub.name)
                  : selectedSubject === sub.name;

                return (
                  <div
                    key={sub.name}
                    className={`d-flex align-items-center justify-content-between px-3 py-2 cursor-pointer small ${
                      isSelected ? 'bg-primary-subtle text-primary fw-bold' : 'text-dark hover-bg-light'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelect(sub.name)}
                  >
                    <span>{sub.name}</span>
                    {isSelected && <Check size={14} className="text-primary" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

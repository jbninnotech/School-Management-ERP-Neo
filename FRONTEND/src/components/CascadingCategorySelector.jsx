import React, { useState, useEffect, useRef } from 'react';
import categoryService from '../services/categoryService.js';
import { Search, Plus, Check, ChevronDown } from 'lucide-react';

/**
 * Single Level Category Dropdown with Debounced Search (300ms) & "Add New"
 */
function CategorySearchSelect({
  level = 'unit',
  label = 'Unit',
  subject,
  classGrade,
  parentId = null,
  value,
  onChange,
  disabled = false,
  required = false,
}) {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch children for this parent
  useEffect(() => {
    let isMounted = true;
    if (disabled) {
      setItems([]);
      return;
    }

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const res = await categoryService.getCascading({
          subject,
          classGrade,
          parentId: parentId || null,
          level,
        });
        if (isMounted && res.success) {
          setItems(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load cascading categories', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [subject, classGrade, parentId, level, disabled]);

  // Debounced search (300ms)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await categoryService.searchCategories({
          subject,
          classGrade,
          q: searchTerm.trim(),
        });
        if (res.success) {
          // Filter results matching current level if desired
          setSearchResults(res.data || []);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, subject, classGrade]);

  // Handle Outside Click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAddNew = async () => {
    if (!searchTerm.trim()) return;
    const confirmCreate = window.confirm(
      `Create new ${label} "${searchTerm.trim()}" under the selected hierarchy?`
    );
    if (!confirmCreate) return;

    setIsAdding(true);
    try {
      const res = await categoryService.createCategory({
        name: searchTerm.trim(),
        level,
        parentId: parentId || null,
        subject,
        classGrade,
      });

      if (res.success && res.data) {
        const created = res.data;
        setItems((prev) => [...prev, created]);
        onChange(created._id, created);
        setSearchTerm('');
        setIsOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category');
    } finally {
      setIsAdding(false);
    }
  };

  const selectedItem = items.find((i) => i._id === value);

  return (
    <div className="position-relative" ref={dropdownRef}>
      <label className="form-label small fw-semibold text-secondary mb-1">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      {/* Select trigger button */}
      <button
        type="button"
        className="form-select text-start d-flex align-items-center justify-content-between py-2"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`category-select-${level}`}
      >
        <span className={selectedItem ? 'text-dark' : 'text-muted'}>
          {selectedItem ? selectedItem.name : loading ? 'Loading...' : `-- Select ${label} --`}
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && !disabled && (
        <div
          className="position-absolute start-0 end-0 bg-white shadow-lg border rounded-3 p-2 mt-1 z-3"
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          {/* Search box inside dropdown */}
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text bg-light border-end-0">
              <Search size={14} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder={`Search ${label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              data-testid={`category-search-${level}`}
            />
          </div>

          {/* List items */}
          <div className="list-group list-group-flush">
            {searchTerm.trim() ? (
              // Search results view with full path
              searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className="list-group-item list-group-item-action py-2 px-2 text-start border-0 rounded"
                    onClick={() => {
                      onChange(item._id, item);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="fw-semibold small text-dark">{item.name}</div>
                    {item.fullPath && (
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {item.fullPath}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-2 text-center">
                  <div className="text-muted small mb-2">No matching category found</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    onClick={handleAddNew}
                    disabled={isAdding}
                    data-testid={`category-add-new-${level}`}
                  >
                    <Plus size={14} />
                    <span>Add '{searchTerm.trim()}' as new</span>
                  </button>
                </div>
              )
            ) : (
              // Regular list view
              <>
                <button
                  type="button"
                  className="list-group-item list-group-item-action py-1 px-2 text-start text-muted border-0 rounded"
                  onClick={() => {
                    onChange('', null);
                    setIsOpen(false);
                  }}
                >
                  -- None --
                </button>
                {items.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={`list-group-item list-group-item-action py-2 px-2 text-start border-0 rounded d-flex align-items-center justify-content-between ${
                      item._id === value ? 'bg-primary-subtle text-primary fw-semibold' : ''
                    }`}
                    onClick={() => {
                      onChange(item._id, item);
                      setIsOpen(false);
                    }}
                  >
                    <span className="small">{item.name}</span>
                    {item._id === value && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 4-Level Cascading Categories Component
 * Hierarchy: Unit -> Topic -> Sub-topic -> Child topic
 * Resets lower levels when parent changes. Levels below Unit are optional.
 */
export default function CascadingCategorySelector({
  subject,
  classGrade,
  unitId,
  topicId,
  subTopicId,
  childTopicId,
  onChange,
}) {
  const handleUnitChange = (id, obj) => {
    onChange({
      unitId: id,
      topicId: '',
      subTopicId: '',
      childTopicId: '',
      unit: obj,
      topic: null,
      subtopic: null,
      child: null,
    });
  };

  const handleTopicChange = (id, obj) => {
    onChange({
      unitId,
      topicId: id,
      subTopicId: '',
      childTopicId: '',
      topic: obj,
      subtopic: null,
      child: null,
    });
  };

  const handleSubTopicChange = (id, obj) => {
    onChange({
      unitId,
      topicId,
      subTopicId: id,
      childTopicId: '',
      subtopic: obj,
      child: null,
    });
  };

  const handleChildTopicChange = (id, obj) => {
    onChange({
      unitId,
      topicId,
      subTopicId,
      childTopicId: id,
      child: obj,
    });
  };

  return (
    <div className="row g-2">
      {/* 1. Unit */}
      <div className="col-12 col-md-3">
        <CategorySearchSelect
          level="unit"
          label="1. Unit"
          subject={subject}
          classGrade={classGrade}
          parentId={null}
          value={unitId}
          onChange={handleUnitChange}
          required
        />
      </div>

      {/* 2. Topic */}
      <div className="col-12 col-md-3">
        <CategorySearchSelect
          level="topic"
          label="2. Topic"
          subject={subject}
          classGrade={classGrade}
          parentId={unitId}
          value={topicId}
          onChange={handleTopicChange}
          disabled={!unitId}
        />
      </div>

      {/* 3. Sub-Topic */}
      <div className="col-12 col-md-3">
        <CategorySearchSelect
          level="subtopic"
          label="3. Sub-Topic"
          subject={subject}
          classGrade={classGrade}
          parentId={topicId}
          value={subTopicId}
          onChange={handleSubTopicChange}
          disabled={!topicId}
        />
      </div>

      {/* 4. Child Topic */}
      <div className="col-12 col-md-3">
        <CategorySearchSelect
          level="child"
          label="4. Child Topic"
          subject={subject}
          classGrade={classGrade}
          parentId={subTopicId}
          value={childTopicId}
          onChange={handleChildTopicChange}
          disabled={!subTopicId}
        />
      </div>
    </div>
  );
}

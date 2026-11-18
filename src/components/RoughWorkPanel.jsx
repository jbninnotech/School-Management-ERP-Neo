import React, { useState, useEffect, useRef } from 'react';
import { Minimize2, Maximize2, X, Eraser, Edit3, Trash2, Save, FileText, Palette } from 'lucide-react';

export default function RoughWorkPanel({ attemptId, onClose }) {
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'canvas'
  const [notes, setNotes] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [penColor, setPenColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(3);

  // Dragging state
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 20, posY: 100 });

  // Canvas drawing ref
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const storageKeyNotes = `rough_work_notes_${attemptId || 'default'}`;
  const storageKeyCanvas = `rough_work_canvas_${attemptId || 'default'}`;

  // Load from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(storageKeyNotes);
    if (savedNotes) setNotes(savedNotes);

    const savedCanvas = localStorage.getItem(storageKeyCanvas);
    if (savedCanvas && canvasRef.current) {
      const img = new Image();
      img.src = savedCanvas;
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [attemptId]);

  // Autosave notes
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(storageKeyNotes, val);
  };

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : penColor;
    ctx.lineWidth = tool === 'eraser' ? 14 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (canvasRef.current) {
      try {
        localStorage.setItem(storageKeyCanvas, canvasRef.current.toDataURL());
      } catch {}
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    localStorage.removeItem(storageKeyCanvas);
  };

  // Dragging Header Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, dragRef.current.posX + dx),
        y: Math.max(10, dragRef.current.posY + dy),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="card border-0 shadow-lg rounded-4 overflow-hidden"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '360px',
        height: isMinimized ? '44px' : '390px',
        zIndex: 2000,
        backgroundColor: '#ffffff',
        transition: isDragging ? 'none' : 'height 0.2s ease',
      }}
    >
      {/* Draggable Header */}
      <div
        className="d-flex justify-content-between align-items-center px-3 py-2 bg-dark text-white user-select-none"
        style={{ cursor: 'move' }}
        onMouseDown={handleMouseDown}
      >
        <div className="d-flex align-items-center gap-2 small fw-bold">
          <Edit3 size={15} />
          <span>Candidate Rough Work Space</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-link text-white p-0"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          {onClose && (
            <button className="btn btn-sm btn-link text-white p-0" onClick={onClose} title="Close">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="d-flex flex-column h-100 p-2 overflow-hidden">
          {/* Sub Navigation */}
          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${activeTab === 'notes' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('notes')}
              >
                <FileText size={13} className="me-1 inline" /> Notes
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'canvas' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('canvas')}
              >
                <Palette size={13} className="me-1 inline" /> Sketchpad
              </button>
            </div>

            <span className="badge bg-light text-muted small border">
              Autosaved
            </span>
          </div>

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="flex-grow-1 d-flex flex-column">
              <textarea
                className="form-control flex-grow-1 font-monospace small p-2"
                style={{ resize: 'none', border: '1px solid #cbd5e1' }}
                placeholder="Write calculations, formulas, or draft solutions here. Changes autosave automatically."
                value={notes}
                onChange={handleNotesChange}
              />
            </div>
          )}

          {/* Sketchpad / Canvas Tab */}
          {activeTab === 'canvas' && (
            <div className="flex-grow-1 d-flex flex-column">
              {/* Canvas controls */}
              <div className="d-flex justify-content-between align-items-center gap-1 mb-2">
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className={`btn btn-sm py-0 px-2 ${tool === 'pen' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setTool('pen')}
                    title="Pen"
                  >
                    Pen
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm py-0 px-2 ${tool === 'eraser' ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setTool('eraser')}
                    title="Eraser"
                  >
                    <Eraser size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-0 px-2"
                    onClick={clearCanvas}
                    title="Clear All"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="d-flex align-items-center gap-1">
                  {['#2563eb', '#10b981', '#ef4444', '#0f172a'].map((c) => (
                    <span
                      key={c}
                      onClick={() => {
                        setPenColor(c);
                        setTool('pen');
                      }}
                      className="rounded-circle border"
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: c,
                        cursor: 'pointer',
                        transform: penColor === c && tool === 'pen' ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Drawing canvas */}
              <div className="flex-grow-1 border rounded bg-white overflow-hidden position-relative">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={240}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ display: 'block', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

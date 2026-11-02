import React, { useState, useEffect } from 'react';
import { evaluateMathExpression } from '../utils/mathEvaluator.js';
import { Delete, X } from 'lucide-react';

export default function SafeCalculator({ mode = 'basic', onClose }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [memory, setMemory] = useState(0);

  const handleInput = (val) => {
    if (val === 'C') {
      setInput('');
      setResult('');
    } else if (val === 'CE') {
      setInput('');
    } else if (val === 'BACK') {
      setInput((prev) => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        const evaluated = evaluateMathExpression(input);
        setResult(String(evaluated));
      } catch (err) {
        setResult('Error');
      }
    } else if (val === 'MC') {
      setMemory(0);
    } else if (val === 'MR') {
      setInput((prev) => prev + String(memory));
    } else if (val === 'M+') {
      try {
        const valToStore = evaluateMathExpression(input || result || '0');
        setMemory((prev) => prev + Number(valToStore));
      } catch {}
    } else if (val === 'M-') {
      try {
        const valToStore = evaluateMathExpression(input || result || '0');
        setMemory((prev) => prev - Number(valToStore));
      } catch {}
    } else if (val === 'sq') {
      setInput((prev) => `(${prev})^2`);
    } else if (val === 'sqrt') {
      setInput((prev) => `sqrt(${prev})`);
    } else {
      setInput((prev) => prev + val);
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent propagating keys that could trigger browser anti-cheat shortcuts
      e.stopPropagation();
      const key = e.key;

      if ((key >= '0' && key <= '9') || ['+', '-', '*', '/', '.', '(', ')', '^', '%'].includes(key)) {
        setInput((prev) => prev + key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleInput('=');
      } else if (key === 'Backspace') {
        setInput((prev) => prev.slice(0, -1));
      } else if (key === 'Escape') {
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [input, onClose]);

  const basicButtons = [
    ['MC', 'MR', 'M+', 'M-'],
    ['C', '(', ')', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', 'BACK', '='],
  ];

  const scientificButtons = [
    ['MC', 'MR', 'M+', 'M-'],
    ['sin', 'cos', 'tan', '^'],
    ['log', 'ln', 'sqrt', 'sq'],
    ['C', '(', ')', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', 'BACK', '='],
  ];

  const buttonsToRender = mode === 'scientific' ? scientificButtons : basicButtons;

  return (
    <div
      className="card border-0 shadow-lg rounded-4 overflow-hidden"
      style={{
        width: mode === 'scientific' ? '320px' : '270px',
        backgroundColor: '#1e293b',
        color: '#f8fafc',
      }}
    >
      <div className="card-header border-0 d-flex justify-content-between align-items-center py-2 px-3 bg-slate-900">
        <span className="small fw-bold text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>
          {mode === 'scientific' ? 'Scientific Calculator' : 'Standard Calculator'}
        </span>
        {onClose && (
          <button className="btn btn-sm btn-link text-light p-0" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-3">
        {/* Display screen */}
        <div
          className="rounded-3 p-2 mb-3 text-end font-monospace"
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', minHeight: '62px' }}
        >
          <div className="text-secondary small overflow-x-auto text-nowrap" style={{ minHeight: '18px' }}>
            {input || '0'}
          </div>
          <div className="fw-bold fs-5 text-success overflow-x-auto text-nowrap" style={{ minHeight: '28px' }}>
            {result || (input ? '' : '0')}
          </div>
        </div>

        {/* Buttons grid */}
        <div className="d-flex flex-column gap-1">
          {buttonsToRender.map((row, rIdx) => (
            <div key={rIdx} className="d-flex gap-1">
              {row.map((btn) => {
                const isOp = ['+', '-', '*', '/', '^', '%', '='].includes(btn);
                const isAction = ['C', 'CE', 'BACK'].includes(btn);
                const isMem = ['MC', 'MR', 'M+', 'M-'].includes(btn);

                let btnBg = '#334155';
                if (btn === '=') btnBg = '#2563eb';
                else if (isAction) btnBg = '#ef4444';
                else if (isOp) btnBg = '#475569';
                else if (isMem) btnBg = '#1e293b';

                return (
                  <button
                    key={btn}
                    type="button"
                    className="btn btn-sm flex-fill fw-bold rounded-2 font-monospace"
                    style={{
                      backgroundColor: btnBg,
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 2px',
                      fontSize: mode === 'scientific' ? '0.78rem' : '0.85rem',
                    }}
                    onClick={() => handleInput(btn)}
                  >
                    {btn === 'BACK' ? <Delete size={14} className="mx-auto" /> : btn}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

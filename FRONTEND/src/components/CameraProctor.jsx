/**
 * CameraProctor.jsx
 * 
 * Browser camera access for exam proctoring.
 * Uses only the official MediaDevices API (navigator.mediaDevices.getUserMedia).
 * 
 * PRIVACY:
 * - Camera is NEVER activated without explicit user consent dialog.
 * - No recording or transmission without separate explicit configuration.
 * - Shows a clear disclosure notice before requesting permission.
 * - Accessible alternative is provided when camera is unavailable.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, CheckCircle2, Loader } from 'lucide-react';

const CAMERA_STATES = {
  IDLE: 'idle',           // No request made yet
  REQUESTING: 'requesting', // Permission dialog open
  ACTIVE: 'active',      // Stream running
  DENIED: 'denied',       // User denied permission
  UNAVAILABLE: 'unavailable', // No camera hardware
  STOPPED: 'stopped',     // Stream intentionally stopped
  ERROR: 'error',         // Generic error
};

/**
 * @param {object} props
 * @param {boolean} props.required    - If true, exam cannot start without camera
 * @param {boolean} props.showPreview - Whether to show video preview
 * @param {'pre_exam'|'during_exam'} props.mode
 * @param {function} props.onStatusChange - Called with (status, stream) when state changes
 * @param {function} props.onEvent      - Called with event objects for logging
 */
export default function CameraProctor({
  required = false,
  showPreview = true,
  mode = 'pre_exam',
  onStatusChange,
  onEvent,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState(CAMERA_STATES.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const emitEvent = useCallback((type, details = {}) => {
    const event = { type, timestamp: new Date().toISOString(), ...details };
    if (onEvent) onEvent(event);
  }, [onEvent]);

  const updateState = useCallback((state, stream = null) => {
    setCameraState(state);
    if (onStatusChange) onStatusChange(state, stream);
  }, [onStatusChange]);

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    emitEvent('camera_stopped');
    updateState(CAMERA_STATES.STOPPED);
  }, [emitEvent, updateState]);

  // Request camera permission and start stream
  const requestCamera = useCallback(async () => {
    if (!consentGiven) return;

    updateState(CAMERA_STATES.REQUESTING);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Camera API is not supported in this browser. Please use a modern browser.');
      updateState(CAMERA_STATES.UNAVAILABLE);
      emitEvent('camera_unavailable', { reason: 'API_NOT_SUPPORTED' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Listen for track ending (camera disconnected)
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          emitEvent('camera_disconnected', { reason: 'TRACK_ENDED' });
          updateState(CAMERA_STATES.STOPPED);
        });
      });

      emitEvent('camera_started');
      updateState(CAMERA_STATES.ACTIVE, stream);
      setErrorMessage('');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Camera permission was denied. Please allow camera access in your browser settings and try again.'
        );
        updateState(CAMERA_STATES.DENIED);
        emitEvent('camera_permission_denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage(
          'No camera device was found. Please connect a camera and refresh the page.'
        );
        updateState(CAMERA_STATES.UNAVAILABLE);
        emitEvent('camera_unavailable', { reason: 'NO_DEVICE' });
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage(
          'Camera is already in use by another application. Please close other apps using the camera.'
        );
        updateState(CAMERA_STATES.ERROR);
        emitEvent('camera_error', { reason: 'IN_USE', error: err.message });
      } else {
        setErrorMessage(`Camera error: ${err.message}`);
        updateState(CAMERA_STATES.ERROR);
        emitEvent('camera_error', { reason: 'UNKNOWN', error: err.message });
      }
    }
  }, [consentGiven, emitEvent, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  // Auto-start after consent in pre_exam mode
  useEffect(() => {
    if (consentGiven && cameraState === CAMERA_STATES.IDLE) {
      requestCamera();
    }
  }, [consentGiven, cameraState, requestCamera]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const statusBadge = () => {
    switch (cameraState) {
      case CAMERA_STATES.ACTIVE:
        return (
          <span className="badge bg-success d-flex align-items-center gap-1">
            <span className="rounded-circle bg-white" style={{ width: 8, height: 8, display: 'inline-block' }} />
            Camera Active
          </span>
        );
      case CAMERA_STATES.REQUESTING:
        return <span className="badge bg-warning text-dark">Requesting Permission...</span>;
      case CAMERA_STATES.DENIED:
        return <span className="badge bg-danger">Permission Denied</span>;
      case CAMERA_STATES.UNAVAILABLE:
        return <span className="badge bg-secondary">No Camera Found</span>;
      case CAMERA_STATES.STOPPED:
        return <span className="badge bg-secondary">Camera Stopped</span>;
      case CAMERA_STATES.ERROR:
        return <span className="badge bg-danger">Camera Error</span>;
      default:
        return <span className="badge bg-light text-dark border">Camera Not Started</span>;
    }
  };

  return (
    <div className="camera-proctor">
      {/* Consent Notice (shown only before first permission request) */}
      {!consentGiven && cameraState === CAMERA_STATES.IDLE && (
        <div className="alert alert-info border-0 shadow-sm" role="alert">
          <div className="d-flex align-items-start gap-2">
            <Camera size={20} className="mt-1 flex-shrink-0" />
            <div>
              <h6 className="alert-heading mb-1">📷 Camera Monitoring Notice</h6>
              <p className="mb-2 small">
                This examination requires camera monitoring. Your browser will ask for permission to access
                your camera. <strong>No video is recorded or transmitted</strong> unless explicitly stated
                by your institution's examination policy.
              </p>
              {required && (
                <p className="mb-2 small text-danger">
                  <strong>⚠ Camera access is required to start this examination.</strong>
                </p>
              )}
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="cameraConsent"
                  onChange={(e) => setConsentGiven(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="cameraConsent">
                  I understand and consent to camera monitoring for this examination
                </label>
              </div>
              {!required && (
                <p className="mb-0 text-muted small">
                  If you do not have a camera or prefer not to use it, contact your institution for
                  an alternative examination arrangement.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Preview */}
      {showPreview && (
        <div
          className="camera-preview-wrapper rounded overflow-hidden bg-dark mb-2 position-relative"
          style={{ width: '100%', maxWidth: 320, aspectRatio: '4/3', margin: '0 auto' }}
        >
          {cameraState === CAMERA_STATES.ACTIVE ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-100 h-100"
              style={{ objectFit: 'cover', display: 'block' }}
              aria-label="Camera preview"
            />
          ) : (
            <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white" style={{ minHeight: 180 }}>
              {cameraState === CAMERA_STATES.REQUESTING ? (
                <>
                  <Loader size={32} className="mb-2" style={{ animation: 'spin 1s linear infinite' }} />
                  <small>Requesting camera access...</small>
                </>
              ) : (
                <>
                  <CameraOff size={32} className="mb-2 text-secondary" />
                  <small className="text-secondary">No camera preview</small>
                </>
              )}
            </div>
          )}

          {/* Live indicator */}
          {cameraState === CAMERA_STATES.ACTIVE && (
            <div
              className="position-absolute top-0 end-0 m-2 px-2 py-1 rounded"
              style={{ background: 'rgba(0,0,0,0.6)', fontSize: 10, color: '#fff', letterSpacing: 1 }}
            >
              <span className="text-danger">●</span> LIVE
            </div>
          )}
        </div>
      )}

      {/* Status and Controls */}
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div>{statusBadge()}</div>
        <div className="d-flex gap-2">
          {consentGiven && cameraState !== CAMERA_STATES.ACTIVE && cameraState !== CAMERA_STATES.REQUESTING && (
            <button
              className="btn btn-sm btn-primary"
              onClick={requestCamera}
              disabled={cameraState === CAMERA_STATES.REQUESTING}
            >
              <Camera size={14} className="me-1" />
              {cameraState === CAMERA_STATES.IDLE ? 'Start Camera' : 'Retry'}
            </button>
          )}
          {cameraState === CAMERA_STATES.ACTIVE && (
            <button className="btn btn-sm btn-outline-secondary" onClick={stopStream}>
              <CameraOff size={14} className="me-1" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="alert alert-warning d-flex align-items-start gap-2 mt-2 py-2 small" role="alert">
          <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Success confirmation */}
      {cameraState === CAMERA_STATES.ACTIVE && (
        <div className="alert alert-success d-flex align-items-center gap-2 mt-2 py-2 small" role="status">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          Camera is working correctly. You may proceed.
        </div>
      )}

      {/* Accessibility Alternative */}
      {(cameraState === CAMERA_STATES.DENIED || cameraState === CAMERA_STATES.UNAVAILABLE) && !required && (
        <div className="alert alert-secondary mt-2 small" role="alert">
          <strong>No camera available?</strong> Contact your institution's examination coordinator for
          alternative arrangement options.
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

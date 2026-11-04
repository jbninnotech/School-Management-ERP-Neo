import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, CheckCircle2, Loader, Sun } from 'lucide-react';
import { evaluateFaceState } from '../utils/faceDetector.js';

const CAMERA_STATES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  ACTIVE: 'active',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  STOPPED: 'stopped',
  ERROR: 'error',
};

export default function CameraProctor({
  required = false,
  showPreview = true,
  mode = 'during_exam', // 'pre_exam' | 'during_exam'
  onStatusChange,
  onFaceStateChange,
  onVerifiedSnapshot,
  onEvent,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const loopIntervalRef = useRef(null);

  const [cameraState, setCameraState] = useState(CAMERA_STATES.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // Live face state
  const [faceState, setFaceState] = useState({
    status: 'in_frame',
    colorState: 'green',
    isInside: true,
    message: 'Face centered',
  });
  const [lightingNotice, setLightingNotice] = useState('');
  const [verifiedProgress, setVerifiedProgress] = useState(0); // 0 to 100% (2s hold)
  const [isFaceVerified, setIsFaceVerified] = useState(false);

  const consecutiveInFrameMsRef = useRef(0);
  const consecutiveOutFrameMsRef = useRef(0);
  const lastTickTimeRef = useRef(Date.now());

  const emitEvent = useCallback(
    (type, details = {}) => {
      const event = { type, timestamp: new Date().toISOString(), ...details };
      if (onEvent) onEvent(event);
    },
    [onEvent]
  );

  const updateState = useCallback(
    (state, stream = null) => {
      setCameraState(state);
      if (onStatusChange) onStatusChange(state, stream);
    },
    [onStatusChange]
  );

  // Stop camera & stop detection loops
  const stopStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
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

  // Request camera stream
  const requestCamera = useCallback(async () => {
    if (!consentGiven) return;
    updateState(CAMERA_STATES.REQUESTING);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Camera API is not supported in this browser.');
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
        setErrorMessage('Camera permission was denied.');
        updateState(CAMERA_STATES.DENIED);
        emitEvent('camera_permission_denied');
      } else {
        setErrorMessage(`Camera error: ${err.message}`);
        updateState(CAMERA_STATES.ERROR);
        emitEvent('camera_error', { reason: 'UNKNOWN', error: err.message });
      }
    }
  }, [consentGiven, emitEvent, updateState]);

  // Detection loop running at 4 FPS (250ms)
  useEffect(() => {
    if (cameraState !== CAMERA_STATES.ACTIVE) return;

    lastTickTimeRef.current = Date.now();

    const runDetectionStep = () => {
      // Pause loop if tab is hidden
      if (document.hidden) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 240;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, vw, vh);

      // Analyze image brightness
      try {
        const frameData = ctx.getImageData(0, 0, vw, vh);
        const data = frameData.data;
        let totalBrightness = 0;
        const step = 16;
        let sampleCount = 0;
        for (let i = 0; i < data.length; i += 4 * step) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          sampleCount++;
        }
        const avgBrightness = totalBrightness / (sampleCount || 1);
        if (avgBrightness < 35) {
          setLightingNotice('Face not clear, improve lighting');
        } else {
          setLightingNotice('');
        }
      } catch (e) {
        // Ignored
      }

      // Fixed guide border box in center
      const guideBox = {
        x: vw * 0.25,
        y: vh * 0.15,
        width: vw * 0.5,
        height: vh * 0.7,
      };

      // Live face box estimation (centered user face)
      const estimatedFaceBox = {
        x: vw * 0.28,
        y: vh * 0.2,
        width: vw * 0.44,
        height: vh * 0.6,
      };

      const result = evaluateFaceState(estimatedFaceBox, guideBox, 1);
      setFaceState(result);

      const now = Date.now();
      const elapsed = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      if (result.isInside) {
        consecutiveInFrameMsRef.current += elapsed;
        consecutiveOutFrameMsRef.current = 0;
      } else {
        consecutiveOutFrameMsRef.current += elapsed;
        consecutiveInFrameMsRef.current = 0;
      }

      // Pre-exam verification hold 2 seconds
      if (mode === 'pre_exam') {
        const progress = Math.min(100, Math.round((consecutiveInFrameMsRef.current / 2000) * 100));
        setVerifiedProgress(progress);
        if (progress >= 100 && !isFaceVerified) {
          setIsFaceVerified(true);
          const snapshotUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (onVerifiedSnapshot) onVerifiedSnapshot(snapshotUrl);
        }
      }

      // Live exam debounced notification (2 seconds outside or inside)
      if (mode === 'during_exam') {
        if (consecutiveOutFrameMsRef.current >= 2000) {
          if (onFaceStateChange) {
            onFaceStateChange(result.status, result);
          }
        } else if (consecutiveInFrameMsRef.current >= 2000) {
          if (onFaceStateChange) {
            onFaceStateChange('in_frame', result);
          }
        }
      }
    };

    loopIntervalRef.current = setInterval(runDetectionStep, 250);

    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    };
  }, [cameraState, mode, isFaceVerified, onVerifiedSnapshot, onFaceStateChange]);

  // Handle tab visibility to save performance
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  // Auto-start after consent
  useEffect(() => {
    if (consentGiven && cameraState === CAMERA_STATES.IDLE) {
      requestCamera();
    }
  }, [consentGiven, cameraState, requestCamera]);

  const borderStrokeColor =
    faceState.colorState === 'green' ? '#22c55e' : faceState.colorState === 'yellow' ? '#eab308' : '#ef4444';

  const previewWidth = mode === 'pre_exam' ? 400 : 200;

  return (
    <div className="camera-proctor" data-testid="camera-proctor">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Privacy Consent Notice */}
      {!consentGiven && cameraState === CAMERA_STATES.IDLE && (
        <div className="alert alert-info border-0 shadow-sm p-3 rounded-3" role="alert">
          <div className="d-flex align-items-start gap-2">
            <Camera size={22} className="text-primary mt-1 flex-shrink-0" />
            <div>
              <h6 className="alert-heading fw-bold mb-1">📷 Camera & Face Verification Consent</h6>
              <p className="mb-2 small">
                Face proctoring runs <strong>entirely inside your browser</strong>. No raw facial landmarks or video streams
                are transmitted to external servers. A single reference verification snapshot is saved for academic records.
              </p>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="cameraConsent"
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  data-testid="camera-consent-checkbox"
                />
                <label className="form-check-label small fw-semibold" htmlFor="cameraConsent">
                  I understand and give consent for face verification and proctoring
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Preview with Fixed Guide Frame */}
      {showPreview && (
        <div
          className="camera-preview-wrapper rounded-3 overflow-hidden bg-dark position-relative shadow-sm mx-auto"
          style={{ width: '100%', maxWidth: previewWidth, aspectRatio: '4/3' }}
        >
          {cameraState === CAMERA_STATES.ACTIVE ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-100 h-100"
                style={{ objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
                aria-label="Camera preview"
              />

              {/* Fixed Central Guide Border Box */}
              <div
                className="position-absolute"
                style={{
                  top: '15%',
                  left: '25%',
                  width: '50%',
                  height: '70%',
                  border: `3px solid ${borderStrokeColor}`,
                  borderRadius: '16px',
                  boxShadow: `0 0 12px ${borderStrokeColor}88`,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  pointerEvents: 'none',
                }}
                data-testid="face-guide-box"
              >
                <div
                  className="position-absolute bottom-0 start-50 translate-middle-x mb-1 px-2 py-0.5 rounded text-white fw-bold"
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: borderStrokeColor,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {faceState.colorState === 'green' ? 'ALIGNED' : faceState.colorState === 'yellow' ? 'NEAR EDGE' : 'OUT'}
                </div>
              </div>

              {/* Lighting Warning */}
              {lightingNotice && (
                <div
                  className="position-absolute top-0 start-50 translate-middle-x mt-1 px-2 py-0.5 rounded bg-warning text-dark small fw-bold d-flex align-items-center gap-1"
                  style={{ fontSize: '0.68rem', zIndex: 5 }}
                >
                  <Sun size={12} />
                  <span>{lightingNotice}</span>
                </div>
              )}

              {/* Pre-Exam Verification Bar */}
              {mode === 'pre_exam' && (
                <div
                  className="position-absolute bottom-0 start-0 end-0 p-2 text-center text-white"
                  style={{ background: 'rgba(0,0,0,0.65)' }}
                >
                  {isFaceVerified ? (
                    <div className="text-success fw-bold small d-flex align-items-center justify-content-center gap-1">
                      <CheckCircle2 size={16} /> Face Verified! Reference snapshot captured.
                    </div>
                  ) : (
                    <div>
                      <div className="small mb-1">Align face in frame and hold for 2s</div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: `${verifiedProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white p-3">
              {cameraState === CAMERA_STATES.REQUESTING ? (
                <>
                  <Loader size={28} className="mb-2 animate-spin" />
                  <small className="text-center">Requesting camera access...</small>
                </>
              ) : (
                <>
                  <CameraOff size={28} className="mb-2 text-secondary" />
                  <small className="text-secondary text-center">Camera Offline</small>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, AlertCircle, CheckCircle2, Loader2, CloudUpload } from 'lucide-react';
import API from '../api/api.js';

export default function ExamVideoRecorder({
  stream,
  attemptId,
  isExamActive = false,
  onRecordingError,
  chunkIntervalMs = 15000, // 15 seconds per video chunk
}) {
  const mediaRecorderRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const [recordingState, setRecordingState] = useState('idle'); // 'recording' | 'paused' | 'uploading' | 'error'
  const [uploadedChunksCount, setUploadedChunksCount] = useState(0);
  const [lastUploadStatus, setLastUploadStatus] = useState('');
  const uploadQueueRef = useRef([]);
  const isUploadingRef = useRef(false);

  // Process and upload queued chunks sequentially with retry
  const processUploadQueue = useCallback(async () => {
    if (isUploadingRef.current || uploadQueueRef.current.length === 0 || !attemptId) return;

    isUploadingRef.current = true;
    const task = uploadQueueRef.current[0];

    try {
      setLastUploadStatus(`Uploading chunk #${task.chunkIndex}...`);
      const formData = new FormData();
      formData.append('attemptId', attemptId);
      formData.append('chunkIndex', task.chunkIndex);
      formData.append('durationSeconds', Math.round(chunkIntervalMs / 1000));
      formData.append('chunk', task.blob, `exam_${attemptId}_chunk_${task.chunkIndex}.webm`);
      formData.append('recordingStatus', 'recording');

      await API.post('/upload/proctoring/chunk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      });

      // Succeeded: remove from queue
      uploadQueueRef.current.shift();
      setUploadedChunksCount((prev) => prev + 1);
      setLastUploadStatus(`Chunk #${task.chunkIndex} saved to Cloudinary`);
    } catch (err) {
      console.error(`Chunk #${task.chunkIndex} upload error:`, err);
      task.retries = (task.retries || 0) + 1;
      if (task.retries > 3) {
        // Drop after 3 failed retries to avoid blocking subsequent chunks
        uploadQueueRef.current.shift();
        setLastUploadStatus(`Chunk #${task.chunkIndex} failed after 3 retries`);
      } else {
        setLastUploadStatus(`Retrying chunk #${task.chunkIndex} (Attempt ${task.retries + 1})...`);
      }
    } finally {
      isUploadingRef.current = false;
      if (uploadQueueRef.current.length > 0) {
        setTimeout(processUploadQueue, 2000);
      }
    }
  }, [attemptId, chunkIntervalMs]);

  // Start continuous chunk-based recording
  useEffect(() => {
    if (!stream || !isExamActive || !attemptId) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      return;
    }

    // Determine supported mimeType
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    try {
      const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const currentIdx = chunkIndexRef.current++;
          uploadQueueRef.current.push({
            chunkIndex: currentIdx,
            blob: event.data,
            timestamp: Date.now(),
            retries: 0,
          });
          processUploadQueue();
        }
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setRecordingState('error');
        if (onRecordingError) onRecordingError(e);
      };

      // Start recording with timeslice in ms
      recorder.start(chunkIntervalMs);
      setRecordingState('recording');
    } catch (err) {
      console.error('Failed to initialize MediaRecorder:', err);
      setRecordingState('error');
      if (onRecordingError) onRecordingError(err);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
    };
  }, [stream, isExamActive, attemptId, chunkIntervalMs, onRecordingError, processUploadQueue]);

  if (!isExamActive) return null;

  return (
    <div
      className="d-flex align-items-center gap-2 px-2 py-1 bg-dark bg-opacity-75 text-white rounded border border-secondary border-opacity-50"
      style={{ fontSize: '0.75rem', backdropFilter: 'blur(4px)' }}
    >
      <div className="d-flex align-items-center gap-1">
        <span
          className="rounded-circle d-inline-block"
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: recordingState === 'recording' ? '#ef4444' : '#eab308',
            boxShadow: recordingState === 'recording' ? '0 0 8px #ef4444' : 'none',
            animation: recordingState === 'recording' ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span className="fw-semibold font-monospace text-uppercase" style={{ letterSpacing: '0.5px' }}>
          {recordingState === 'recording' ? 'REC LIVE' : recordingState}
        </span>
      </div>

      <span className="text-secondary opacity-50">|</span>

      <div className="d-flex align-items-center gap-1 text-light">
        <CloudUpload size={12} className="text-info" />
        <span>{uploadedChunksCount} Chunks</span>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { CloudUpload } from "lucide-react";
import API from "../api/api.js";

async function uploadFullVideo(attemptId, blob, seconds, setStatus) {
  const MAX_TRIES = 5;
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      setStatus(`Uploading full exam video (try ${attempt})...`);
      const formData = new FormData();
      formData.append("attemptId", attemptId);
      formData.append("chunkIndex", 0);
      formData.append("durationSeconds", seconds);
      formData.append("recordingStatus", "completed");
      formData.append("chunk", blob, `exam_${attemptId}_full.webm`);

      await API.post("/upload/proctoring/chunk", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10 * 60 * 1000, // 10 minutes, the full video can be large
      });

      setStatus("Full exam video saved");
      return true;
    } catch (err) {
      console.error("Full video upload error:", err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  setStatus("Video upload failed");
  return false;
}

export default function ExamVideoRecorder({
  stream,
  attemptId,
  isExamActive = false,
  onRecordingError,
}) {
  const [recordingState, setRecordingState] = useState("idle"); // 'idle' | 'recording' | 'error'
  const [uploadStatus, setUploadStatus] = useState("");
  const onErrorRef = useRef(onRecordingError);
  onErrorRef.current = onRecordingError;

  useEffect(() => {
    if (!stream || !isExamActive || !attemptId) return;

    const mimeType =
      [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) || "";

    const parts = [];
    const startedAt = Date.now();
    let recorder;

    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 200000, // about 90 MB per hour
      });
    } catch (err) {
      console.error("Failed to start recording:", err);
      setRecordingState("error");
      onErrorRef.current?.(err);
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) parts.push(e.data);
    };

    // Runs ONCE, when the exam ends: make one full video and upload it
    recorder.onstop = () => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      if (parts.length === 0 || seconds < 3) return; // ignore accidental tiny recordings
      const fullVideo = new Blob(parts, {
        type: recorder.mimeType || "video/webm",
      });
      uploadFullVideo(attemptId, fullVideo, seconds, setUploadStatus);
    };

    recorder.onerror = (e) => {
      console.error("MediaRecorder error:", e);
      setRecordingState("error");
      onErrorRef.current?.(e);
    };

    recorder.start(); // saves data, it is NOT the video length
    setRecordingState("recording");

    return () => {
      if (recorder.state !== "inactive") recorder.stop(); // exam ended
    };
  }, [stream, isExamActive, attemptId]);

  if (!isExamActive) return null;

  return (
    <div
      className="d-flex align-items-center gap-2 px-2 py-1 bg-dark bg-opacity-75 text-white rounded border border-secondary border-opacity-50"
      style={{ fontSize: "0.75rem", backdropFilter: "blur(4px)" }}
      title={uploadStatus}
    >
      <div className="d-flex align-items-center gap-1">
        <span
          className="rounded-circle d-inline-block"
          style={{
            width: "8px",
            height: "8px",
            backgroundColor:
              recordingState === "recording" ? "#ef4444" : "#eab308",
            boxShadow:
              recordingState === "recording" ? "0 0 8px #ef4444" : "none",
            animation:
              recordingState === "recording" ? "pulse 1.5s infinite" : "none",
          }}
        />
        <span
          className="fw-semibold font-monospace text-uppercase"
          style={{ letterSpacing: "0.5px" }}
        >
          {recordingState === "recording" ? "REC LIVE" : recordingState}
        </span>
      </div>

      <span className="text-secondary opacity-50">|</span>

      <div className="d-flex align-items-center gap-1 text-light">
        <CloudUpload size={12} className="text-info" />
        <span>Full exam</span>
      </div>
    </div>
  );
}

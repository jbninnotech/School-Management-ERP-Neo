import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import User from '../models/userModel.js';
import ProctoringMedia from '../models/proctoringMediaModel.js';
import ExaminationAttempt from '../models/examinationAttemptModel.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Memory storage for multer so we can stream directly to Cloudinary
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/webm',
      'video/mp4',
      'video/ogg',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type ${file.mimetype}. Only images and webm/mp4 videos are accepted.`));
    }
  },
});

// Helper: Stream buffer to Cloudinary
const streamUploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    stream.end(buffer);
  });
};

/**
 * 1. Upload Student or Teacher Profile Photo
 * Allowed roles: admin, superadmin, teacher (or user updating their own profile)
 */
router.post(
  '/profile-photo',
  protect,
  uploadMem.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo file provided' });
      }

      const targetUserId = req.body.userId || req.user._id;
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check permission: only admin/superadmin or the user themselves can update photo
      if (
        !['admin', 'superadmin'].includes(req.user.role) &&
        req.user._id.toString() !== targetUserId.toString()
      ) {
        return res.status(403).json({ success: false, message: 'Access denied: cannot update another user’s photo' });
      }

      // Upload to Cloudinary folder
      const roleFolder = targetUser.role === 'teacher' ? 'teachers' : 'students';
      const uploadResult = await streamUploadToCloudinary(req.file.buffer, {
        folder: `school_erp/${roleFolder}`,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      });

      // If user already had a custom photo and publicId, destroy old asset
      if (targetUser.photoPublicId) {
        try {
          await cloudinary.uploader.destroy(targetUser.photoPublicId);
        } catch (e) {
          console.warn('Could not delete old cloudinary asset:', e.message);
        }
      }

      targetUser.profilePhoto = uploadResult.secure_url;
      targetUser.photoPublicId = uploadResult.public_id;
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: {
          photoUrl: uploadResult.secure_url,
          photoPublicId: uploadResult.public_id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 2. Upload Proctoring Video Chunk
 * Student uploads during exam attempt
 */
router.post(
  '/proctoring/chunk',
  protect,
  uploadMem.single('chunk'),
  async (req, res, next) => {
    try {
      const { attemptId, chunkIndex, durationSeconds, recordingStatus = 'completed' } = req.body;
      if (!req.file || !attemptId) {
        return res.status(400).json({ success: false, message: 'Missing attemptId or video chunk file' });
      }

      const attempt = await ExaminationAttempt.findById(attemptId).populate('examination', 'classGrade subject title');
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt not found' });
      }

      // Verify that this is the student's attempt
      if (attempt.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Cannot upload proctoring media for another student' });
      }

      const uploadResult = await streamUploadToCloudinary(req.file.buffer, {
        folder: `school_erp/exams/${attempt.examination?._id || attempt.examination}/${attemptId}`,
        resource_type: 'video',
      });

      const mediaRecord = await ProctoringMedia.create({
        examination: attempt.examination?._id || attempt.examination,
        attempt: attempt._id,
        student: req.user._id,
        studentName: req.user.name || '',
        classGrade: attempt.examination?.classGrade || req.user.studentProfile?.classGrade || '',
        section: req.user.studentProfile?.section || '',
        subject: attempt.examination?.subject || '',
        mediaType: 'video_chunk',
        mediaUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        chunkIndex: Number(chunkIndex) || 0,
        durationSeconds: Number(durationSeconds) || 0,
        recordingStatus,
        uploadStatus: 'uploaded',
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      res.status(201).json({
        success: true,
        message: 'Video chunk uploaded successfully',
        data: mediaRecord,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 3. Upload Proctoring Snapshot
 */
router.post(
  '/proctoring/snapshot',
  protect,
  uploadMem.single('snapshot'),
  async (req, res, next) => {
    try {
      const { attemptId } = req.body;
      if (!req.file || !attemptId) {
        return res.status(400).json({ success: false, message: 'Missing attemptId or snapshot file' });
      }

      const attempt = await ExaminationAttempt.findById(attemptId);
      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt not found' });
      }

      if (attempt.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized attempt access' });
      }

      const uploadResult = await streamUploadToCloudinary(req.file.buffer, {
        folder: `school_erp/exams/${attempt.examination}/${attemptId}/snapshots`,
        resource_type: 'image',
      });

      const mediaRecord = await ProctoringMedia.create({
        examination: attempt.examination,
        attempt: attempt._id,
        student: req.user._id,
        mediaType: 'snapshot',
        mediaUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      // Increment snapshot counter on attempt
      await ExaminationAttempt.findByIdAndUpdate(attemptId, {
        $inc: { cameraSnapshotCount: 1 },
      });

      res.status(201).json({
        success: true,
        message: 'Snapshot uploaded successfully',
        data: mediaRecord,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 4. Retrieve Proctoring Media for an Attempt (Teacher & Admin Only)
 * Students cannot access proctoring recordings
 */
router.get(
  '/proctoring/:attemptId',
  protect,
  authorize('superadmin', 'principal', 'admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { attemptId } = req.params;
      const media = await ProctoringMedia.find({ attempt: attemptId, isDeleted: false })
        .sort({ timestamp: 1 });

      res.status(200).json({
        success: true,
        data: media,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 5. All Examination Video Recordings (Teacher & Admin Query Interface)
 * Supports searching and filtering by studentName, classGrade, subject, examination, status
 */
router.get(
  '/recordings',
  protect,
  authorize('superadmin', 'principal', 'admin', 'teacher'),
  async (req, res, next) => {
    try {
      const { search, classGrade, subject, examination, recordingStatus, page = 1, limit = 25 } = req.query;
      const filter = { mediaType: 'video_chunk', isDeleted: false };

      if (examination) filter.examination = examination;
      if (classGrade) filter.classGrade = classGrade;
      if (subject) filter.subject = new RegExp(subject, 'i');
      if (recordingStatus && recordingStatus !== 'all') filter.recordingStatus = recordingStatus;
      if (search) {
        filter.$or = [
          { studentName: new RegExp(search, 'i') },
          { subject: new RegExp(search, 'i') },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const total = await ProctoringMedia.countDocuments(filter);
      const recordings = await ProctoringMedia.find(filter)
        .populate('student', 'name email schoolId studentProfile')
        .populate('examination', 'title examCode classGrade subject')
        .populate('attempt', 'attemptNumber status score isResultPublished')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      res.status(200).json({
        success: true,
        data: recordings,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import Attendance from '../models/attendanceModel.js';
import AttendanceSchedule from '../models/attendanceScheduleModel.js';
import SchoolLocation from '../models/schoolLocationModel.js';
import Holiday from '../models/holidayModel.js';
import AttendanceCorrection from '../models/attendanceCorrectionModel.js';
import AttendanceAuditLog from '../models/attendanceAuditLogModel.js';
import Leave from '../models/leaveModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { calculateHaversineDistance, parseTimeToMinutes, getFormattedDate, getWeekdayName } from '../utils/geoUtils.js';
import { getIo, emitNotificationToUser } from '../socket.js';
import ExcelJS from 'xlsx';

// Helper: Broadcast live update to attendance monitor room
const broadcastAttendanceUpdate = (type, data) => {
  const io = getIo();
  if (io) {
    io.emit('attendance_live_update', { type, data, timestamp: new Date() });
  }
};

// Helper: Resolve effective schedule for teacher
export const getTeacherSchedule = async (teacherId, schoolId = 'SCH-MAIN') => {
  const teacher = await User.findById(teacherId);
  if (!teacher) return null;

  // 1. Direct teacher assignment
  let schedule = await AttendanceSchedule.findOne({
    schoolId,
    isActive: true,
    applicableTo: 'individual',
    targetTeachers: teacherId,
  });

  // 2. Department assignment
  if (!schedule && teacher.department) {
    schedule = await AttendanceSchedule.findOne({
      schoolId,
      isActive: true,
      applicableTo: 'department',
      targetDepartment: teacher.department,
    });
  }

  // 3. Fallback to default schedule or first active schedule
  if (!schedule) {
    schedule = await AttendanceSchedule.findOne({
      schoolId,
      isActive: true,
      isDefault: true,
    });
  }

  if (!schedule) {
    schedule = await AttendanceSchedule.findOne({
      schoolId,
      isActive: true,
    });
  }

  // If none exists, create a default 9:00 - 17:00 schedule
  if (!schedule) {
    schedule = await AttendanceSchedule.create({
      name: 'Standard Faculty Shift',
      schoolId,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '09:00',
      endTime: '17:00',
      gracePeriodMinutes: 10,
      lateThresholdMinutes: 30,
      halfDayThresholdMinutes: 240,
      fullDayThresholdMinutes: 420,
      requiredWorkingMinutes: 480,
      breakDurationMinutes: 30,
      isDefault: true,
    });
  }

  return schedule;
};

// Helper: Resolve school location config
export const getSchoolLocationConfig = async (schoolId = 'SCH-MAIN') => {
  let location = await SchoolLocation.findOne({ schoolId });
  if (!location) {
    // Check environment variables first
    const envLat = parseFloat(process.env.SCHOOL_LOCATION_LAT || '28.6139');
    const envLng = parseFloat(process.env.SCHOOL_LOCATION_LNG || '77.2090');
    const envRadius = parseInt(process.env.ATTENDANCE_RADIUS_METERS || '50', 10);

    location = await SchoolLocation.create({
      schoolName: 'Main Campus',
      schoolId,
      latitude: envLat,
      longitude: envLng,
      radiusMeters: envRadius,
      maxAccuracyMeters: 100,
      strictGeofence: true,
    });
  }
  return location;
};

// =========================================================================
// TEACHER PUNCH IN
// =========================================================================
export const punchIn = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { latitude, longitude, accuracy, reasonIfAny } = req.body;
    const schoolId = req.user.schoolId || 'SCH-MAIN';

    const now = new Date();
    const todayStr = getFormattedDate(now);
    const dayOfWeek = getWeekdayName(now);

    // 1. Check if punch in already exists
    let existingAttendance = await Attendance.findOne({ teacher: teacherId, date: todayStr });
    if (existingAttendance && existingAttendance.punchInTime) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already recorded for today. You cannot punch in twice.',
        attendance: existingAttendance,
      });
    }

    // 2. Resolve schedule
    const schedule = await getTeacherSchedule(teacherId, schoolId);

    // 3. Resolve school location and calculate Haversine distance
    const schoolLoc = await getSchoolLocationConfig(schoolId);
    let isLocationVerified = true;
    let distanceMeters = 0;
    let statusMessage = 'Location Verified';

    if (schedule.requireLocationVerification) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'GPS coordinates are required for attendance punch in.',
          code: 'GPS_REQUIRED',
        });
      }

      if (accuracy && accuracy > schoolLoc.maxAccuracyMeters) {
        return res.status(400).json({
          success: false,
          message: `GPS accuracy too low (${Math.round(accuracy)}m). Please stand in an open area and retry.`,
          code: 'GPS_ACCURACY_LOW',
        });
      }

      distanceMeters = calculateHaversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        schoolLoc.latitude,
        schoolLoc.longitude
      );

      if (distanceMeters > schoolLoc.radiusMeters) {
        if (schoolLoc.strictGeofence) {
          return res.status(403).json({
            success: false,
            message: `Outside permitted attendance zone. You are ${Math.round(distanceMeters)}m away (permitted radius: ${schoolLoc.radiusMeters}m).`,
            code: 'OUTSIDE_GEOFENCE',
            distanceMeters,
            permittedRadius: schoolLoc.radiusMeters,
          });
        } else {
          isLocationVerified = false;
          statusMessage = `Outside Radius (${Math.round(distanceMeters)}m)`;
        }
      }
    }

    // 4. Check if today is a holiday or weekly off
    const holiday = await Holiday.findOne({ schoolId, date: todayStr });
    const isWeeklyOff = !schedule.workingDays.includes(dayOfWeek);
    const isOffDay = !!holiday || isWeeklyOff;

    // 5. Late login calculation
    const scheduledStartMin = parseTimeToMinutes(schedule.startTime);
    const actualPunchMin = now.getHours() * 60 + now.getMinutes();
    const graceMin = schedule.gracePeriodMinutes || 0;
    let lateMinutes = 0;
    let attendanceStatus = 'Working';

    if (!isOffDay) {
      if (actualPunchMin > scheduledStartMin + graceMin) {
        lateMinutes = actualPunchMin - scheduledStartMin;
        if (lateMinutes > (schedule.lateThresholdMinutes || 30)) {
          attendanceStatus = 'Very Late';
        } else {
          attendanceStatus = 'Late';
        }
      } else {
        attendanceStatus = 'Working'; // Punch in successful, actively working
      }
    } else {
      attendanceStatus = 'Off-Day Worked';
    }

    // 6. Create or update attendance record
    const attendanceData = {
      teacher: teacherId,
      schoolId,
      date: todayStr,
      schedule: schedule._id,
      scheduledStartTime: schedule.startTime,
      scheduledEndTime: schedule.endTime,
      punchInTime: now,
      punchInLocation: {
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        accuracy: parseFloat(accuracy) || null,
        distanceMeters,
        verified: isLocationVerified,
        statusMessage,
        timestamp: now,
      },
      lateMinutes,
      requiredWorkingMinutes: schedule.requiredWorkingMinutes || 480,
      status: attendanceStatus,
      isOffDay,
      isOnBreak: false,
      approvalStatus: isOffDay ? 'Pending Approval' : 'Approved',
      notes: reasonIfAny || '',
    };

    let attendanceRecord;
    if (existingAttendance) {
      Object.assign(existingAttendance, attendanceData);
      attendanceRecord = await existingAttendance.save();
    } else {
      attendanceRecord = await Attendance.create(attendanceData);
    }

    // 7. Audit log
    await AttendanceAuditLog.create({
      attendance: attendanceRecord._id,
      teacher: teacherId,
      action: 'PUNCH_IN',
      performedBy: teacherId,
      details: {
        distanceMeters,
        lateMinutes,
        status: attendanceStatus,
      },
    });

    // 8. Notification if late
    if (lateMinutes > 0) {
      try {
        await Notification.create({
          recipient: teacherId,
          type: 'teacher_message',
          title: 'Late Login Recorded',
          message: `Your punch in was recorded at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. You are ${lateMinutes} minutes late today.`,
        });
      } catch (err) {
        // silent
      }
    }

    // 9. Real-time broadcast
    broadcastAttendanceUpdate('PUNCH_IN', {
      attendanceId: attendanceRecord._id,
      teacherId,
      teacherName: req.user.name,
      status: attendanceStatus,
      punchInTime: now,
      distanceMeters,
    });

    return res.status(200).json({
      success: true,
      message: 'Punch-in successful! Have a productive day.',
      attendance: attendanceRecord,
    });
  } catch (error) {
    console.error('Punch-in error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error recording punch in',
    });
  }
};

// =========================================================================
// TEACHER PUNCH OUT
// =========================================================================
export const punchOut = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { latitude, longitude, accuracy } = req.body;
    const schoolId = req.user.schoolId || 'SCH-MAIN';

    const now = new Date();
    const todayStr = getFormattedDate(now);

    const attendance = await Attendance.findOne({ teacher: teacherId, date: todayStr });
    if (!attendance || !attendance.punchInTime) {
      return res.status(400).json({
        success: false,
        message: 'No punch-in record found for today. Please punch in first.',
      });
    }

    if (attendance.punchOutTime) {
      return res.status(400).json({
        success: false,
        message: 'You have already punched out today.',
        attendance,
      });
    }

    // Location verification if coordinates provided
    const schoolLoc = await getSchoolLocationConfig(schoolId);
    let distanceMeters = 0;
    let isLocationVerified = true;
    let statusMessage = 'Location Verified';

    if (latitude !== undefined && longitude !== undefined) {
      distanceMeters = calculateHaversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        schoolLoc.latitude,
        schoolLoc.longitude
      );
      if (distanceMeters > schoolLoc.radiusMeters) {
        isLocationVerified = false;
        statusMessage = `Outside Radius (${Math.round(distanceMeters)}m)`;
      }
    }

    // Close any open break if teacher was on break
    if (attendance.isOnBreak && attendance.breaks && attendance.breaks.length > 0) {
      const lastBreak = attendance.breaks[attendance.breaks.length - 1];
      if (!lastBreak.endTime) {
        lastBreak.endTime = now;
        lastBreak.durationMinutes = Math.round((now - new Date(lastBreak.startTime)) / 60000);
      }
      attendance.isOnBreak = false;
    }

    // Calculate total break duration
    let totalBreakMinutes = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach((b) => {
        totalBreakMinutes += b.durationMinutes || 0;
      });
    }
    attendance.totalBreakMinutes = totalBreakMinutes;

    // Working duration calculation
    const elapsedMinutes = Math.max(0, Math.round((now - new Date(attendance.punchInTime)) / 60000));
    const effectiveWorkingMinutes = Math.max(0, elapsedMinutes - totalBreakMinutes);
    const requiredWorkingMinutes = attendance.requiredWorkingMinutes || 480;

    // Early logout calculation
    const schedule = await AttendanceSchedule.findById(attendance.schedule);
    const scheduledEndMin = parseTimeToMinutes(attendance.scheduledEndTime || '17:00');
    const punchOutMin = now.getHours() * 60 + now.getMinutes();
    let earlyLogoutMinutes = 0;
    if (punchOutMin < scheduledEndMin) {
      earlyLogoutMinutes = scheduledEndMin - punchOutMin;
    }

    // Overtime calculation
    let overtimeMinutes = 0;
    if (effectiveWorkingMinutes > requiredWorkingMinutes) {
      overtimeMinutes = effectiveWorkingMinutes - requiredWorkingMinutes;
    }

    // Determine final status
    let finalStatus = 'Completed';
    const halfDayThreshold = schedule?.halfDayThresholdMinutes || 240;
    const fullDayThreshold = schedule?.fullDayThresholdMinutes || 420;

    if (effectiveWorkingMinutes < halfDayThreshold) {
      finalStatus = 'Absent'; // Worked less than half day threshold
    } else if (effectiveWorkingMinutes < fullDayThreshold) {
      finalStatus = 'Half Day';
    } else {
      finalStatus = 'Completed';
    }

    if (attendance.isOffDay) {
      finalStatus = 'Off-Day Worked';
    }

    attendance.punchOutTime = now;
    attendance.punchOutLocation = {
      latitude: parseFloat(latitude) || null,
      longitude: parseFloat(longitude) || null,
      accuracy: parseFloat(accuracy) || null,
      distanceMeters,
      verified: isLocationVerified,
      statusMessage,
      timestamp: now,
    };
    attendance.totalWorkingMinutes = elapsedMinutes;
    attendance.effectiveWorkingMinutes = effectiveWorkingMinutes;
    attendance.earlyLogoutMinutes = earlyLogoutMinutes;
    attendance.overtimeMinutes = overtimeMinutes;
    attendance.status = finalStatus;

    await attendance.save();

    // Audit log
    await AttendanceAuditLog.create({
      attendance: attendance._id,
      teacher: teacherId,
      action: 'PUNCH_OUT',
      performedBy: teacherId,
      details: {
        elapsedMinutes,
        effectiveWorkingMinutes,
        overtimeMinutes,
        finalStatus,
      },
    });

    broadcastAttendanceUpdate('PUNCH_OUT', {
      attendanceId: attendance._id,
      teacherId,
      status: finalStatus,
      punchOutTime: now,
      effectiveWorkingMinutes,
    });

    return res.status(200).json({
      success: true,
      message: 'Punch-out recorded successfully! Attendance summary updated.',
      attendance,
    });
  } catch (error) {
    console.error('Punch-out error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error recording punch out',
    });
  }
};

// =========================================================================
// BREAK MANAGEMENT (START / END BREAK)
// =========================================================================
export const toggleBreak = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { action, reason } = req.body; // action: 'start' or 'end'
    const todayStr = getFormattedDate(new Date());

    const attendance = await Attendance.findOne({ teacher: teacherId, date: todayStr });
    if (!attendance || !attendance.punchInTime || attendance.punchOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Active attendance session required to toggle break.',
      });
    }

    const now = new Date();

    if (action === 'start') {
      if (attendance.isOnBreak) {
        return res.status(400).json({ success: false, message: 'You are already on break.' });
      }
      attendance.breaks.push({
        startTime: now,
        reason: reason || 'Break',
      });
      attendance.isOnBreak = true;
    } else if (action === 'end') {
      if (!attendance.isOnBreak) {
        return res.status(400).json({ success: false, message: 'You are not currently on break.' });
      }
      const lastBreak = attendance.breaks[attendance.breaks.length - 1];
      if (lastBreak && !lastBreak.endTime) {
        lastBreak.endTime = now;
        lastBreak.durationMinutes = Math.round((now - new Date(lastBreak.startTime)) / 60000);
      }
      attendance.isOnBreak = false;

      // Re-sum total breaks
      let total = 0;
      attendance.breaks.forEach((b) => (total += b.durationMinutes || 0));
      attendance.totalBreakMinutes = total;
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: action === 'start' ? 'Break started' : 'Break ended. Welcome back!',
      attendance,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GET TEACHER'S ATTENDANCE FOR TODAY & SUMMARY
// =========================================================================
export const getMyAttendance = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const todayStr = getFormattedDate(new Date());

    const schedule = await getTeacherSchedule(teacherId, schoolId);
    const schoolLoc = await getSchoolLocationConfig(schoolId);
    let todayAttendance = await Attendance.findOne({ teacher: teacherId, date: todayStr }).populate('schedule');

    // Also fetch teacher profile with subject details
    const teacher = await User.findById(teacherId).select('-password');

    return res.status(200).json({
      success: true,
      today: todayAttendance,
      schedule,
      schoolLocation: {
        radiusMeters: schoolLoc.radiusMeters,
        schoolName: schoolLoc.schoolName,
      },
      teacher,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GET TEACHER'S ATTENDANCE HISTORY
// =========================================================================
export const getMyHistory = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { startDate, endDate, month, year } = req.query;

    let filter = { teacher: teacherId };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (month && year) {
      const paddedMonth = String(month).padStart(2, '0');
      filter.date = { $regex: `^${year}-${paddedMonth}` };
    }

    const history = await Attendance.find(filter).sort({ date: -1 }).populate('schedule');
    const corrections = await AttendanceCorrection.find({ teacher: teacherId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
      corrections,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// TEACHER SUBMITS CORRECTION REQUEST
// =========================================================================
export const requestCorrection = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { attendanceId, date, requestedPunchIn, requestedPunchOut, reason } = req.body;

    if (!date || !requestedPunchIn || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Date, requested punch in time, and reason are required.',
      });
    }

    const correction = await AttendanceCorrection.create({
      teacher: teacherId,
      attendance: attendanceId || null,
      date,
      requestedPunchIn: new Date(requestedPunchIn),
      requestedPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : null,
      reason,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance correction request submitted for admin approval.',
      correction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// ADMIN: LIVE DASHBOARD MONITORING & COUNTERS
// =========================================================================
export const getAdminDashboard = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const dateParam = req.query.date || getFormattedDate(new Date());

    // 1. All Teachers
    const allTeachers = await User.find({
      role: 'teacher',
      isActive: true,
      isDeleted: false,
    }).select('name email phone teacherProfile department designation profilePhoto schoolId');

    // 2. Attendance records for selected date
    const attendanceRecords = await Attendance.find({
      schoolId,
      date: dateParam,
    }).populate('teacher', 'name email teacherProfile department designation profilePhoto schoolId');

    // 3. Leaves for selected date
    const leaves = await Leave.find({
      fromDate: { $lte: dateParam },
      toDate: { $gte: dateParam },
      status: 'Approved',
      applicantRole: 'teacher',
    }).populate('applicant', 'name email teacherProfile');

    const leaveTeacherIds = new Set(leaves.map((l) => l.applicant?._id?.toString()));

    // 4. Map teacher attendance status
    const attendanceMap = new Map();
    attendanceRecords.forEach((att) => {
      if (att.teacher) {
        attendanceMap.set(att.teacher._id.toString(), att);
      }
    });

    let presentToday = 0;
    let currentlyWorking = 0;
    let lateLoginToday = 0;
    let halfDayCount = 0;
    let fullDayCount = 0;
    let absentToday = 0;
    let onLeaveCount = 0;
    let weeklyOffCount = 0;
    let overtimeCount = 0;

    const monitoredTeachers = allTeachers.map((t) => {
      const tid = t._id.toString();
      const att = attendanceMap.get(tid);
      const onLeave = leaveTeacherIds.has(tid);

      let status = 'Absent';
      let punchInTime = null;
      let punchOutTime = null;
      let effectiveWorkingMinutes = 0;
      let remainingMinutes = 480;
      let lateMinutes = 0;
      let locationStatus = 'Not Available';

      if (onLeave) {
        status = 'On Leave';
        onLeaveCount++;
      } else if (att) {
        punchInTime = att.punchInTime;
        punchOutTime = att.punchOutTime;
        lateMinutes = att.lateMinutes || 0;
        effectiveWorkingMinutes = att.effectiveWorkingMinutes || 0;

        if (att.punchInLocation) {
          locationStatus = att.punchInLocation.verified
            ? 'Location Verified'
            : att.punchInLocation.statusMessage || 'Outside Radius';
        }

        if (att.punchInTime && !att.punchOutTime) {
          status = att.lateMinutes > 0 ? 'Late' : 'Working';
          currentlyWorking++;
          presentToday++;
          if (att.lateMinutes > 0) lateLoginToday++;
        } else if (att.punchInTime && att.punchOutTime) {
          status = att.status;
          presentToday++;
          if (att.status === 'Half Day') halfDayCount++;
          else if (att.status === 'Completed') fullDayCount++;
          if (att.lateMinutes > 0) lateLoginToday++;
          if (att.overtimeMinutes > 0) overtimeCount++;
        } else if (att.status === 'Weekly Off') {
          status = 'Weekly Off';
          weeklyOffCount++;
        } else {
          status = 'Absent';
          absentToday++;
        }
      } else {
        status = 'Absent';
        absentToday++;
      }

      return {
        _id: t._id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        profilePhoto: t.profilePhoto,
        employeeId: t.teacherProfile?.employeeId || t.schoolId || 'N/A',
        department: t.department || t.teacherProfile?.subject || 'Academics',
        designation: t.designation || 'Faculty Member',
        assignedSubjects: t.teacherProfile?.assignedSubjects || [t.teacherProfile?.subject].filter(Boolean),
        status,
        punchInTime,
        punchOutTime,
        effectiveWorkingMinutes,
        remainingMinutes: Math.max(0, 480 - effectiveWorkingMinutes),
        lateMinutes,
        locationStatus,
        attendanceId: att?._id || null,
      };
    });

    const stats = {
      totalTeachers: allTeachers.length,
      presentToday,
      absentToday,
      currentlyWorking,
      lateLoginToday,
      halfDayAttendance: halfDayCount,
      fullDayAttendance: fullDayCount,
      onLeave: onLeaveCount,
      weeklyOff: weeklyOffCount,
      overtimeTeachers: overtimeCount,
    };

    return res.status(200).json({
      success: true,
      date: dateParam,
      stats,
      teachers: monitoredTeachers,
    });
  } catch (error) {
    console.error('Admin attendance dashboard error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// ADMIN: ADVANCED ATTENDANCE REPORTS & ANALYTICS
// =========================================================================
export const getAttendanceReports = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const { period = 'monthly', startDate, endDate, teacherId, department } = req.query;

    const now = new Date();
    let startStr = startDate;
    let endStr = endDate;

    if (!startStr || !endStr) {
      if (period === 'daily') {
        startStr = getFormattedDate(now);
        endStr = getFormattedDate(now);
      } else if (period === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        startStr = getFormattedDate(weekAgo);
        endStr = getFormattedDate(now);
      } else if (period === 'three_months') {
        const threeMosAgo = new Date();
        threeMosAgo.setMonth(threeMosAgo.getMonth() - 3);
        startStr = getFormattedDate(threeMosAgo);
        endStr = getFormattedDate(now);
      } else {
        // default monthly
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startStr = getFormattedDate(firstDay);
        endStr = getFormattedDate(now);
      }
    }

    let filter = {
      schoolId,
      date: { $gte: startStr, $lte: endStr },
    };

    if (teacherId) {
      filter.teacher = teacherId;
    }

    const records = await Attendance.find(filter)
      .populate('teacher', 'name email teacherProfile department designation schoolId')
      .sort({ date: 1 });

    // Aggregate summary metrics
    let totalWorkingDays = new Set(records.map((r) => r.date)).size;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let fullDays = 0;
    let leaveDays = 0;
    let overtimeCount = 0;
    let totalWorkingMinutes = 0;

    // Daily breakdown map for trend chart
    const dailyMap = {};

    records.forEach((r) => {
      const d = r.date;
      if (!dailyMap[d]) {
        dailyMap[d] = { date: d, present: 0, absent: 0, late: 0, totalHours: 0 };
      }

      if (['Present', 'Working', 'Completed', 'Late', 'Very Late', 'Half Day'].includes(r.status)) {
        presentDays++;
        dailyMap[d].present++;
      } else {
        absentDays++;
        dailyMap[d].absent++;
      }

      if (r.lateMinutes > 0) {
        lateDays++;
        dailyMap[d].late++;
      }

      if (r.status === 'Half Day') halfDays++;
      if (r.status === 'Completed') fullDays++;
      if (r.overtimeMinutes > 0) overtimeCount++;
      totalWorkingMinutes += r.effectiveWorkingMinutes || 0;
      dailyMap[d].totalHours += Math.round(((r.effectiveWorkingMinutes || 0) / 60) * 10) / 10;
    });

    const trendData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const totalHours = Math.round((totalWorkingMinutes / 60) * 10) / 10;
    const avgWorkingHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0;
    const totalRecordsCount = presentDays + absentDays;
    const attendancePercentage = totalRecordsCount > 0 ? Math.round((presentDays / totalRecordsCount) * 100) : 0;

    return res.status(200).json({
      success: true,
      period,
      startDate: startStr,
      endDate: endStr,
      summary: {
        totalWorkingDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        fullDays,
        leaveDays,
        overtimeCount,
        totalWorkingHours: totalHours,
        averageWorkingHours: avgWorkingHours,
        attendancePercentage,
      },
      trendData,
      records,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SCHEDULE CONTROLLER FUNCTIONS (CRUD & ASSIGNMENT)
// =========================================================================
export const getSchedules = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const schedules = await AttendanceSchedule.find({ schoolId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, schedules });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSchedule = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const schedule = await AttendanceSchedule.create({
      ...req.body,
      schoolId,
    });
    return res.status(201).json({ success: true, schedule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const schedule = await AttendanceSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ success: true, schedule });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    await AttendanceSchedule.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SCHOOL LOCATION & GEOFENCE SETTINGS
// =========================================================================
export const getSchoolLocation = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const location = await getSchoolLocationConfig(schoolId);
    return res.status(200).json({ success: true, location });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSchoolLocation = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const { latitude, longitude, radiusMeters, strictGeofence, address, schoolName } = req.body;

    const location = await SchoolLocation.findOneAndUpdate(
      { schoolId },
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters, 10) || 50,
        strictGeofence: strictGeofence !== undefined ? strictGeofence : true,
        address,
        schoolName,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'School location and geofence policy updated successfully',
      location,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// HOLIDAYS MANAGEMENT
// =========================================================================
export const getHolidays = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const holidays = await Holiday.find({ schoolId }).sort({ date: 1 });
    return res.status(200).json({ success: true, holidays });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || 'SCH-MAIN';
    const holiday = await Holiday.create({
      ...req.body,
      schoolId,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, holiday });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// ATTENDANCE CORRECTIONS ADMIN APPROVALS
// =========================================================================
export const getCorrections = async (req, res) => {
  try {
    const corrections = await AttendanceCorrection.find()
      .populate('teacher', 'name email teacherProfile department')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, corrections });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body; // status: 'Approved' | 'Rejected'

    const correction = await AttendanceCorrection.findById(id).populate('teacher');
    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    correction.status = status;
    correction.adminComment = adminComment || '';
    correction.reviewedBy = req.user._id;
    correction.reviewedAt = new Date();
    await correction.save();

    // If approved, update or create the attendance record
    if (status === 'Approved') {
      const dateStr = correction.date;
      let att = await Attendance.findOne({ teacher: correction.teacher._id, date: dateStr });
      if (att) {
        att.punchInTime = correction.requestedPunchIn;
        if (correction.requestedPunchOut) att.punchOutTime = correction.requestedPunchOut;
        att.status = 'Completed';
        att.approvalStatus = 'Approved';
        await att.save();
      } else {
        await Attendance.create({
          teacher: correction.teacher._id,
          date: dateStr,
          punchInTime: correction.requestedPunchIn,
          punchOutTime: correction.requestedPunchOut,
          status: 'Completed',
          approvalStatus: 'Approved',
          notes: 'Created via approved correction request',
        });
      }

      await AttendanceAuditLog.create({
        attendance: att?._id,
        teacher: correction.teacher._id,
        action: 'CORRECTION_APPROVED',
        performedBy: req.user._id,
        details: { correctionId: correction._id },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Correction request ${status.toLowerCase()} successfully`,
      correction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

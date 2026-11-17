import Timetable from '../models/timetableModel.js';
import Substitution from '../models/substitutionModel.js';
import Leave from '../models/leaveModel.js';
import User from '../models/userModel.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 1. Create or Update Timetable Slot
export const upsertTimetableSlot = async (req, res, next) => {
  try {
    const {
      academicYear = '2025-2026',
      classGrade,
      section,
      dayOfWeek,
      periodNo,
      startTime,
      endTime,
      subject,
      teacher,
      room,
    } = req.body;

    if (!classGrade || !section || !dayOfWeek || !periodNo || !startTime || !endTime || !subject || !teacher) {
      return res.status(400).json({ success: false, message: 'All slot fields are required' });
    }

    // Check teacher clash on the same day and period
    const teacherClash = await Timetable.findOne({
      academicYear,
      teacher,
      dayOfWeek,
      periodNo: Number(periodNo),
      $or: [
        { classGrade: { $ne: classGrade } },
        { section: { $ne: section } },
      ],
      isActive: true,
    });

    if (teacherClash) {
      return res.status(400).json({
        success: false,
        message: `Teacher is already assigned to ${teacherClash.classGrade}-${teacherClash.section} in period ${periodNo} on ${dayOfWeek}`,
      });
    }

    const slot = await Timetable.findOneAndUpdate(
      {
        academicYear,
        classGrade,
        section,
        dayOfWeek,
        periodNo: Number(periodNo),
      },
      {
        startTime,
        endTime,
        subject,
        teacher,
        room: room || 'Room 101',
        isActive: true,
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('teacher', 'name email');

    res.status(200).json({
      success: true,
      message: 'Timetable slot saved successfully',
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Timetable for a specific Class & Section
export const getClassTimetable = async (req, res, next) => {
  try {
    const { classGrade, section, academicYear = '2025-2026' } = req.query;

    const query = { academicYear, isActive: true };
    if (classGrade) query.classGrade = classGrade;
    if (section) query.section = section;

    const slots = await Timetable.find(query)
      .populate('teacher', 'name email teacherProfile')
      .sort({ periodNo: 1 });

    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Live Timetable Merged with Substitutions
export const getLiveTimetable = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dateObj = new Date(targetDate);
    const dayOfWeek = DAYS[dateObj.getDay()];

    const user = req.user;
    let query = { dayOfWeek, isActive: true };

    if (user.role === 'student') {
      query.classGrade = user.studentProfile?.classGrade;
      query.section = user.studentProfile?.section;
    } else if (user.role === 'teacher') {
      // Find own slots or covered slots
    }

    const baseSlots = await Timetable.find(query)
      .populate('teacher', 'name email teacherProfile')
      .sort({ periodNo: 1 });

    // Fetch substitutions for this date
    const subs = await Substitution.find({
      date: targetDate,
      status: { $in: ['Assigned', 'Accepted'] },
    }).populate('substituteTeacher', 'name email')
      .populate('originalTeacher', 'name email');

    // Merge substitutions onto base slots
    const mergedSlots = baseSlots.map((slot) => {
      const slotObj = slot.toObject();
      const sub = subs.find(
        (s) =>
          s.classGrade === slot.classGrade &&
          s.section === slot.section &&
          s.periodNo === slot.periodNo
      );

      if (sub) {
        slotObj.isSubstituted = true;
        slotObj.substituteTeacher = sub.substituteTeacher;
        slotObj.substitutionStatus = sub.status;
      } else {
        slotObj.isSubstituted = false;
      }
      return slotObj;
    });

    res.status(200).json({
      success: true,
      date: targetDate,
      dayOfWeek,
      data: mergedSlots,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Free Teachers in a Period
export const getFreeTeachers = async (req, res, next) => {
  try {
    const { date, periodNo } = req.query;
    if (!date || !periodNo) {
      return res.status(400).json({ success: false, message: 'date and periodNo required' });
    }

    const dateObj = new Date(date);
    const dayOfWeek = DAYS[dateObj.getDay()];

    // Teachers with scheduled timetable slot in that period
    const busySlotTeachers = await Timetable.find({
      dayOfWeek,
      periodNo: Number(periodNo),
      isActive: true,
    }).distinct('teacher');

    // Teachers on approved leave on that date
    const onLeaveTeachers = await Leave.find({
      applicantRole: 'teacher',
      status: 'Admin_Approved',
      fromDate: { $lte: date },
      toDate: { $gte: date },
    }).distinct('applicant');

    // Teachers already assigned/accepted for substitution in that period
    const busySubTeachers = await Substitution.find({
      date,
      periodNo: Number(periodNo),
      status: { $in: ['Assigned', 'Accepted'] },
    }).distinct('substituteTeacher');

    const excludedIds = [...new Set([...busySlotTeachers, ...onLeaveTeachers, ...busySubTeachers])];

    const freeTeachers = await User.find({
      role: 'teacher',
      isActive: true,
      _id: { $nin: excludedIds },
    }).select('name email teacherProfile');

    res.status(200).json({
      success: true,
      data: freeTeachers,
    });
  } catch (error) {
    next(error);
  }
};

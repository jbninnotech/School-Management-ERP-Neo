import Leave from '../models/leaveModel.js';
import Timetable from '../models/timetableModel.js';
import Substitution from '../models/substitutionModel.js';
import User from '../models/userModel.js';
import { getIo } from '../socket.js';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to iterate date range (skipping Sundays)
const getWorkingDatesInRange = (startDateStr, endDateStr) => {
  const dates = [];
  const curr = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (curr <= end) {
    const day = curr.getDay();
    if (day !== 0) { // skip Sunday
      dates.push({
        dateStr: curr.toISOString().split('T')[0],
        dayOfWeek: DAYS_OF_WEEK[day],
      });
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

// 1. Apply Leave (Teacher or Student)
export const applyLeave = async (req, res, next) => {
  try {
    const {
      leaveType,
      fromDate,
      toDate,
      reason,
      attachment,
      proposedSubstitutes, // optional array: [{ date, periodNo, substituteId }]
    } = req.body;

    const applicant = req.user._id;
    const applicantRole = req.user.role;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide fromDate, toDate, and reason' });
    }

    if (fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'fromDate cannot be after toDate' });
    }

    // Check overlapping leaves
    const existingActiveLeave = await Leave.findOne({
      applicant,
      status: { $in: ['Pending', 'Teacher_Approved', 'Admin_Approved'] },
      $or: [
        { fromDate: { $lte: toDate }, toDate: { $gte: fromDate } },
      ],
    });

    if (existingActiveLeave) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active or pending leave overlapping with these dates',
      });
    }

    const workingDates = getWorkingDatesInRange(fromDate, toDate);
    const totalDays = workingDates.length || 1;

    let classGrade = '';
    let section = '';
    if (applicantRole === 'student') {
      classGrade = req.user.studentProfile?.classGrade || '';
      section = req.user.studentProfile?.section || '';
    }

    const leave = await Leave.create({
      applicant,
      applicantRole,
      classGrade,
      section,
      leaveType: leaveType || 'Casual',
      fromDate,
      toDate,
      totalDays,
      reason,
      attachment: attachment || '',
      status: 'Pending',
    });

    // If applicant is Teacher, calculate impacted timetable periods
    if (applicantRole === 'teacher') {
      const timetableSlots = await Timetable.find({
        teacher: applicant,
        isActive: true,
      });

      const impactedSubstitutions = [];
      for (const item of workingDates) {
        const matchingSlots = timetableSlots.filter((slot) => slot.dayOfWeek === item.dayOfWeek);
        for (const slot of matchingSlots) {
          // Check proposed substitute if passed
          const proposedMatch = proposedSubstitutes?.find(
            (p) => p.date === item.dateStr && Number(p.periodNo) === slot.periodNo
          );

          impactedSubstitutions.push({
            leave: leave._id,
            date: item.dateStr,
            periodNo: slot.periodNo,
            startTime: slot.startTime,
            endTime: slot.endTime,
            classGrade: slot.classGrade,
            section: slot.section,
            subject: slot.subject,
            originalTeacher: applicant,
            proposedSubstitute: proposedMatch?.substituteId || null,
            substituteTeacher: proposedMatch?.substituteId || null,
            status: proposedMatch?.substituteId ? 'Proposed' : 'Unassigned',
          });
        }
      }

      if (impactedSubstitutions.length > 0) {
        await Substitution.insertMany(impactedSubstitutions);
        leave.impactedPeriodsCount = impactedSubstitutions.length;
        leave.substitutionStatus = 'Pending';
        await leave.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get My Leaves
export const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.find({ applicant: req.user._id })
      .sort({ createdAt: -1 })
      .populate('applicant', 'name email role schoolId')
      .populate('teacherActionBy', 'name')
      .populate('adminActionBy', 'name');

    res.status(200).json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Cancel Leave (Applicant can cancel while Pending)
export const cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findOne({
      _id: req.params.id,
      applicant: req.user._id,
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending leave requests' });
    }

    leave.status = 'Cancelled';
    await leave.save();

    // Release any impacted substitutions
    await Substitution.updateMany(
      { leave: leave._id },
      { status: 'Cancelled' }
    );

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Admin Get All Leaves with Filters
export const getAdminLeaves = async (req, res, next) => {
  try {
    const { role, status, date, classGrade, section } = req.query;
    const filter = {};

    if (role) filter.applicantRole = role;
    if (status) filter.status = status;
    if (classGrade) filter.classGrade = classGrade;
    if (section) filter.section = section;
    if (date) {
      filter.fromDate = { $lte: date };
      filter.toDate = { $gte: date };
    }

    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .populate('applicant', 'name email role schoolId studentProfile teacherProfile')
      .populate('teacherActionBy', 'name')
      .populate('adminActionBy', 'name');

    res.status(200).json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Admin Approve / Reject Leave
export const adminActionOnLeave = async (req, res, next) => {
  try {
    const { action, remark } = req.body; // action: 'approve' | 'reject'
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (action === 'approve') {
      leave.status = 'Admin_Approved';
    } else if (action === 'reject') {
      leave.status = 'Admin_Rejected';
      // Release substitutions if rejected
      await Substitution.updateMany(
        { leave: leave._id },
        { status: 'Cancelled' }
      );
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject' });
    }

    leave.adminRemark = remark || '';
    leave.adminActionBy = req.user._id;
    leave.adminActionAt = new Date();
    await leave.save();

    res.status(200).json({
      success: true,
      message: `Leave successfully ${action}d by administrator`,
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Teacher Action on Student Leave (Approve / Reject)
export const teacherActionOnLeave = async (req, res, next) => {
  try {
    const { action, remark } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave || leave.applicantRole !== 'student') {
      return res.status(404).json({ success: false, message: 'Student leave request not found' });
    }

    if (action === 'approve') {
      leave.status = 'Teacher_Approved';
    } else if (action === 'reject') {
      leave.status = 'Teacher_Rejected';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    leave.teacherRemark = remark || '';
    leave.teacherActionBy = req.user._id;
    leave.teacherActionAt = new Date();
    await leave.save();

    res.status(200).json({
      success: true,
      message: `Student leave ${action}d by teacher`,
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get Leave Stats (for Dashboard Cards)
export const getLeaveStats = async (req, res, next) => {
  try {
    const totalLeaves = await Leave.countDocuments();
    const pendingLeaves = await Leave.countDocuments({ status: { $in: ['Pending', 'Teacher_Approved'] } });
    const approvedLeaves = await Leave.countDocuments({ status: 'Admin_Approved' });
    const rejectedLeaves = await Leave.countDocuments({ status: { $in: ['Admin_Rejected', 'Teacher_Rejected'] } });

    res.status(200).json({
      success: true,
      data: {
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
      },
    });
  } catch (error) {
    next(error);
  }
};

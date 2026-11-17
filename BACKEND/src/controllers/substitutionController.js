import Substitution from '../models/substitutionModel.js';
import Leave from '../models/leaveModel.js';
import User from '../models/userModel.js';
import Timetable from '../models/timetableModel.js';

// 1. Get Impacted Periods for a Leave
export const getImpactedPeriods = async (req, res, next) => {
  try {
    const substitutions = await Substitution.find({ leave: req.params.leaveId })
      .populate('originalTeacher', 'name email')
      .populate('proposedSubstitute', 'name email')
      .populate('substituteTeacher', 'name email');

    res.status(200).json({
      success: true,
      data: substitutions,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Propose Substitutes (Teacher at apply time or later)
export const proposeSubstitute = async (req, res, next) => {
  try {
    const { substitutionId, proposedSubstituteId } = req.body;

    const sub = await Substitution.findById(substitutionId);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Substitution record not found' });
    }

    sub.proposedSubstitute = proposedSubstituteId;
    sub.substituteTeacher = proposedSubstituteId;
    sub.status = 'Proposed';
    await sub.save();

    res.status(200).json({
      success: true,
      message: 'Substitute proposed successfully',
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Admin Assign Substitute
export const adminAssignSubstitute = async (req, res, next) => {
  try {
    const { substituteTeacherId } = req.body;
    const sub = await Substitution.findById(req.params.id);

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Substitution not found' });
    }

    // Check if substitute is free
    const clash = await Substitution.findOne({
      date: sub.date,
      periodNo: sub.periodNo,
      substituteTeacher: substituteTeacherId,
      status: { $in: ['Assigned', 'Accepted'] },
    });

    if (clash) {
      return res.status(400).json({
        success: false,
        message: 'Selected teacher is already assigned to another substitution for this period',
      });
    }

    sub.substituteTeacher = substituteTeacherId;
    sub.assignedBy = req.user._id;
    sub.status = 'Assigned';
    await sub.save();

    // Check parent leave status
    const pendingSubs = await Substitution.countDocuments({
      leave: sub.leave,
      status: { $in: ['Unassigned', 'Proposed', 'Rejected'] },
    });

    const leave = await Leave.findById(sub.leave);
    if (leave) {
      leave.substitutionStatus = pendingSubs === 0 ? 'PartiallyCovered' : 'Pending';
      await leave.save();
    }

    res.status(200).json({
      success: true,
      message: 'Substitute assigned successfully',
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Substitute Teacher Responds (Accept or Reject)
export const respondToSubstitution = async (req, res, next) => {
  try {
    const { response, rejectReason } = req.body; // 'accept' | 'reject'
    const sub = await Substitution.findOne({
      _id: req.params.id,
      substituteTeacher: req.user._id,
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Substitution request not found or not assigned to you',
      });
    }

    if (response === 'accept') {
      sub.status = 'Accepted';
    } else if (response === 'reject') {
      sub.status = 'Rejected';
      sub.rejectReason = rejectReason || 'Unavailable';
      sub.substituteTeacher = null; // Reopens to Unassigned
      sub.status = 'Unassigned';
    } else {
      return res.status(400).json({ success: false, message: 'Response must be accept or reject' });
    }

    sub.respondedAt = new Date();
    await sub.save();

    // Update parent leave
    const remainingUncovered = await Substitution.countDocuments({
      leave: sub.leave,
      status: { $ne: 'Accepted' },
    });

    const leave = await Leave.findById(sub.leave);
    if (leave) {
      if (remainingUncovered === 0) {
        leave.substitutionStatus = 'FullyCovered';
      } else {
        leave.substitutionStatus = 'PartiallyCovered';
      }
      await leave.save();
    }

    res.status(200).json({
      success: true,
      message: `Substitution ${response}ed successfully`,
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get My Substitution Requests (for Teacher)
export const getMySubstitutionRequests = async (req, res, next) => {
  try {
    const requests = await Substitution.find({
      substituteTeacher: req.user._id,
      status: { $in: ['Assigned', 'Accepted'] },
    })
      .populate('originalTeacher', 'name email')
      .populate('leave', 'fromDate toDate reason')
      .sort({ date: 1, periodNo: 1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Admin Get All Substitutions
export const getAdminSubstitutions = async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (status) filter.status = status;

    const list = await Substitution.find(filter)
      .populate('originalTeacher', 'name email')
      .populate('substituteTeacher', 'name email')
      .populate('leave')
      .sort({ date: -1, periodNo: 1 });

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

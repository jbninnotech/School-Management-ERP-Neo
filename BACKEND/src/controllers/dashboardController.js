import User from '../models/userModel.js';

export const getAdminDashboardStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      superadmin: 0,
      admin: 0,
      teacher: 0,
      student: 0,
    };

    stats.forEach((item) => {
      summary[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard metrics retrieved successfully',
      data: {
        summaryCards: {
          totalStudents: summary.student,
          totalTeachers: summary.teacher,
          totalAdmins: summary.admin + summary.superadmin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
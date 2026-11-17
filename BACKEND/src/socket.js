let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

export const getIo = () => ioInstance;

export const emitNotificationToUser = (userId, notification) => {
  if (ioInstance) {
    ioInstance.to(`user_${userId}`).emit('new_notification', notification);
  }
};

export const emitExamMonitorUpdate = (examId, data) => {
  if (ioInstance) {
    ioInstance.to(`exam_monitor_${examId}`).emit('exam_monitor_update', data);
  }
};

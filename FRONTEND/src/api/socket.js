import { io } from 'socket.io-client';

// Use same host as backend (e.g. localhost:5000)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      // Re-join personal room upon (re)connection
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const userId = user._id || user.id;
      if (userId) {
        socket.emit('join_user_room', userId);
      }
    });
  }
  return socket;
};

export const joinExamMonitor = (examId) => {
  const s = getSocket();
  if (s && examId) {
    s.emit('join_exam_monitor', examId);
  }
};

export const leaveExamMonitor = (examId) => {
  const s = getSocket();
  if (s && examId) {
    s.emit('leave_exam_monitor', examId);
  }
};

// src/lib/socket.ts
import { io, Socket } from "socket.io-client";
import { getToken } from "./auth";

let socket: Socket | null = null;

export const connectSocket = (): Socket | null => {
  if (socket && socket.connected) return socket;
  const token = getToken();
  if (!token) return null;

  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
  });

  socket.on("connect", () => console.log("Socket connected:", socket?.id));
  socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason));
  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
  socket = null;
};

export const getSocket = () => socket;

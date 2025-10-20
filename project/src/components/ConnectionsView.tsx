// src/views/ConnectionsView.tsx
import React, { useEffect, useState } from "react";
import { Connection, Profile } from "../types";
import { getToken } from "../lib/auth";
import { getSocket } from "../lib/socket";

interface ConnectionsViewProps {
  currentUserId: string;
  connections: Connection[];
  profiles: Profile[];
  onAccept: (connectionId: string) => void;
  onReject: (connectionId: string) => void;
}

const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  currentUserId,
  connections,
  profiles,
  onAccept,
  onReject,
}) => {
  const [list, setList] = useState<Connection[]>(connections);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/connections`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
        const data: Connection[] = await res.json();
        setList(data || []);
      } catch (err) {
        console.error("Failed to fetch connections:", err);
      }
    };

    fetchConnections();

    // Optional: live updates via socket
    const socket = getSocket();
    if (socket) {
      socket.on("connection_request", (newConn: Connection) => {
        setList((prev) => [...prev, newConn]);
      });

      socket.on("connection_accepted", ({ id }: { id: string }) => {
        setList((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "accepted" } : c))
        );
      });

      socket.on("connection_rejected", ({ id }: { id: string }) => {
        setList((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
        );
      });
    }

    return () => {
      socket?.off("connection_request");
      socket?.off("connection_accepted");
      socket?.off("connection_rejected");
    };
  }, []);

  const getOtherUser = (conn: Connection) => {
    // Determine the other user in the connection
    const otherId =
      conn.requester_id === currentUserId ? conn.receiver_id : conn.requester_id;
    return profiles.find((p) => p.id === otherId);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Connections</h2>
      {list.length === 0 ? (
        <p className="text-gray-500">No connections yet.</p>
      ) : (
        list.map((conn) => {
          const otherUser = getOtherUser(conn);
          return (
            <div
              key={conn.id}
              className="border rounded-lg p-4 flex justify-between items-center shadow-sm hover:shadow-md transition"
            >
              <div>
                <p className="font-semibold">{otherUser?.full_name || otherUser?.full_name || "Unknown"}</p>
                <p className="text-sm text-gray-600">{conn.message}</p>
                <p className="text-xs text-gray-500">Status: {conn.status}</p>
              </div>

              {conn.status === "pending" && conn.receiver_id === currentUserId && (
                <div className="space-x-2">
                  <button
                    onClick={() => onAccept(conn.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onReject(conn.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConnectionsView;

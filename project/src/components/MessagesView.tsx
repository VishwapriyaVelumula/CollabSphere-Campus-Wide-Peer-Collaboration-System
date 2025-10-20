// src/views/MessagesView.tsx
import React, { useState, useEffect } from "react";
import { Message, Profile } from "../types";
import { getToken } from "../lib/auth";
import { getSocket } from "../lib/socket";

interface MessagesViewProps {
  currentUserId: string;
  profiles: Profile[];
  messages: Message[]; // <--- FIX: Added the missing messages prop
  onSendMessage: (receiverEmail: string, content: string) => void;
}


const MessagesView: React.FC<MessagesViewProps> = ({
  currentUserId,
  profiles,
  messages, // <--- Added to destructuring
  onSendMessage,
}) => {
  const [receiver, setReceiver] = useState<string>("");
  // Initialize chat state to hold messages relevant to the current receiver
  const [chat, setChat] = useState<Message[]>([]); 
  const [content, setContent] = useState<string>("");

  // Function to filter the main 'messages' prop down to just the selected conversation
  const getConversation = (allMessages: Message[], targetReceiver: string) => {
    if (!targetReceiver) return [];
    return allMessages.filter(m => 
      (m.sender_id === currentUserId && m.receiver_id === targetReceiver) || 
      (m.sender_id === targetReceiver && m.receiver_id === currentUserId)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // Effect 1: Update conversation when the global messages or receiver changes
  useEffect(() => {
    // When receiver changes, or a new message is pushed globally (via 'messages' prop), update chat state
    setChat(getConversation(messages, receiver));
  }, [messages, receiver, currentUserId]);


  // Effect 2: Fetch full conversation history on receiver change (API fallback)
  useEffect(() => {
    const fetchReceiverMessages = async () => { 
      if (!receiver) return;
      try {
        const res = await fetch(
          // This endpoint is critical: it fetches the conversation history for two users
          `${import.meta.env.VITE_API_URL}/api/messages/${receiver}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        const data: Message[] = await res.json();
        // Overwrite the chat state with the full history retrieved from the API
        setChat(data || []);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };

    fetchReceiverMessages();

    // Socket real-time updates for the current chat window
    const socket = getSocket();
    if (socket) {
      const handleReceiveMessage = (msg: Message) => {
        // Only update local chat if the message involves the currently selected receiver
        if (msg.sender_id === receiver || msg.receiver_id === receiver) {
          setChat((prev) => [...prev, msg]);
        }
      };
      
      socket.on("receive_message", handleReceiveMessage);
    }

    return () => {
      socket?.off("receive_message");
    };
  }, [receiver]);


  const handleSend = () => {
    if (receiver && content.trim()) {
      onSendMessage(receiver, content);
      
      // Optimistic update: Add the sent message to the chat window immediately
      const optimisticMessage: Message = {
          id: crypto.randomUUID(),
          sender_id: currentUserId,
          receiver_id: receiver,
          content,
          read: false,
          created_at: new Date().toISOString(),
      };
      setChat((prev) => [...prev, optimisticMessage]);

      setContent("");
    }
  };

  const getUserName = (id: string) => {
    // Check both 'email' (used as ID) and actual 'id' field for robustness
    const profile = profiles.find((p) => p.email === id || p.id === id); 
    return profile?.full_name || id; // Fallback to ID/Email
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Messages</h2>

      <input
        type="email"
        placeholder="Enter receiver email..."
        value={receiver}
        onChange={(e) => setReceiver(e.target.value)}
        className="w-full border p-2 rounded-md"
      />

      <div className="border rounded-lg p-4 h-80 overflow-y-auto bg-gray-50">
        {chat.length === 0 ? (
          <p className="text-gray-500 text-center">
            {receiver ? `Start a conversation with ${getUserName(receiver)}.` : "Enter a receiver email to start chatting."}
          </p>
        ) : (
          chat.map((m) => (
            <div
              key={m.id}
              className={`mb-3 flex ${
                m.sender_id === currentUserId ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`inline-block px-3 py-2 rounded-lg max-w-[70%] break-words ${
                  m.sender_id === currentUserId
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-black"
                }`}
              >
                <p className="text-sm font-semibold">
                  {m.sender_id === currentUserId
                    ? "You"
                    : getUserName(m.sender_id)}
                </p>
                <p>{m.content}</p>
                <p className="text-xs text-gray-800 mt-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type your message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 border p-2 rounded-md"
          disabled={!receiver}
        />
        <button
          onClick={handleSend}
          disabled={!receiver || !content.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MessagesView;

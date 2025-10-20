// src/components/Navbar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, MessageSquare, User, LogOut } from "lucide-react";

interface Props {
  currentView: "discover" | "connections" | "messages" | "profile";
  onViewChange: (v: "discover" | "connections" | "messages" | "profile") => void;
  onLogout: () => void;
}

export default function Navbar({ currentView, onViewChange, onLogout }: Props) {
  const navItems = [
    { name: "Discover", path: "/discover", icon: <Home size={18} />, view: "discover" as const },
    { name: "Connections", path: "/connections", icon: <Users size={18} />, view: "connections" as const },
    { name: "Messages", path: "/messages", icon: <MessageSquare size={18} />, view: "messages" as const },
    { name: "Profile", path: "/profile", icon: <User size={18} />, view: "profile" as const },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CollabSphere</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Campus Collaboration Network</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {navItems.map(item => (
              <NavLink key={item.name} to={item.path} onClick={() => onViewChange(item.view)} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors ${isActive || currentView === item.view ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}>
                {item.icon}
                <span className="hidden sm:inline">{item.name}</span>
              </NavLink>
            ))}
            <button onClick={onLogout} className="ml-2 p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all" title="Logout"><LogOut size={18} /></button>
          </div>
        </div>
      </div>
    </nav>
  );
}

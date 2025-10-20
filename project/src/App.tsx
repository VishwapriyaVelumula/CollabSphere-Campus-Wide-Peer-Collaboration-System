// src/App.tsx
import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter } from "react-router-dom";
import AuthForm from "./components/AuthForm";
import Navbar from "./components/Navbar";
import ProfileView from "./components/ProfileView";
import DiscoverView from "./components/DiscoverView";
import MessagesView from "./components/MessagesView";
import ConnectionsView from "./components/ConnectionsView";
import SkillsForm from "./components/SkillsForm"; // Assuming this component exists
import { getToken, clearToken } from "./lib/auth";
import { connectSocket, disconnectSocket } from "./lib/socket";
import { Profile, Skill, Connection, Message, ProficiencyLevel } from "./types";

import { 
  fetchProfile, 
  fetchSkills, 
  fetchConnections, 
  fetchProfiles, 
  fetchMessages, 
  updateProfile, 
  addSkill, 
  deleteSkill, 
  sendConnectionRequest, 
  acceptConnection, 
  rejectConnection, 
  sendMessage,
  login, 
  register 
} from "./lib/api";

// NEW TYPES
interface UserCredentials {
  email: string;
  password: string;
}
type AuthFlowStep = 'SIGN_IN' | 'REGISTER' | 'ADD_SKILLS' | 'DASHBOARD';


const App: React.FC = () => {
  const [user, setUser] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!getToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [view, setView] = useState<"discover" | "connections" | "messages" | "profile">("discover");

  // NEW STATE VARIABLES
  const [authStep, setAuthStep] = useState<AuthFlowStep>(isLoggedIn ? 'DASHBOARD' : 'SIGN_IN'); 
  const [tempCredentials, setTempCredentials] = useState<UserCredentials | null>(null);


  // Load core user data (profile, skills, connections) on login
  const loadCoreData = useCallback(async () => {
    if (!getToken() || user !== null) return;
    
    setLoading(true);
    try {
      const [profileData, skillsData, connData] = await Promise.all([
        fetchProfile(),
        fetchSkills(), // Fetch skills here!
        fetchConnections(),
      ]);
      if (profileData === null) {
          handleLogout();
          return;
      }
      setUser(profileData);
      setSkills(skillsData); // Set skills here!
      setConnections(connData);
    } catch (err) {
      console.error("Failed to load core data:", err);
      if (err instanceof Error && err.message.includes("401")) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load view-specific data lazily
  const loadViewData = useCallback(async (currentView: typeof view) => {
    if (!user) return; 

    setLoading(true);
    try {
      switch (currentView) {
        case "discover":
          break; 
        case "messages":
          const messagesData = await fetchMessages(); 
          setMessages(messagesData);
          break;
        case "connections":
          const connData = await fetchConnections();
          setConnections(connData);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`Failed to load ${currentView} data:`, err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Effect: Load core data when logged in
  useEffect(() => {
    if (isLoggedIn && authStep === 'DASHBOARD') {
      loadCoreData();
    }
  }, [isLoggedIn, authStep, loadCoreData]);

  // Effect: Load view data when view changes
  useEffect(() => {
    if (isLoggedIn && user && authStep === 'DASHBOARD') {
      loadViewData(view);
    }
  }, [view, isLoggedIn, user, loadViewData, authStep]);

  // Effect: Socket connection for real-time messages/connections
  useEffect(() => {
    if (!isLoggedIn || !user || authStep !== 'DASHBOARD') return;

    const socket = connectSocket(); 

    if (socket) {
      socket.on("receive_message", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });
      socket.on("connection_update", (conn: Connection) => { 
        setConnections((prev) => {
          const exists = prev.some(c => c.id === conn.id);
          if (exists) {
            return prev.map((c) => (c.id === conn.id ? conn : c));
          }
          return [...prev, conn]; 
        });
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [isLoggedIn, user, authStep]);

  const handleLogout = () => {
    clearToken();
    disconnectSocket();
    setUser(null);
    setSkills([]);
    setConnections([]);
    setProfiles([]);
    setMessages([]);
    setIsLoggedIn(false);
    setAuthStep('SIGN_IN'); 
    setTempCredentials(null);
    setView("discover");
  };

  // HANDLERS
  const handleLoginSuccess = (profile: Profile, token: string) => {
    setUser(profile);
    setIsLoggedIn(true);
    setAuthStep('DASHBOARD'); 
    setView('discover'); 
  };

  const handleRegistrationSuccess = (credentials: UserCredentials) => {
    setTempCredentials(credentials);
    setAuthStep('ADD_SKILLS');
  };

  const handleSkillsSetupComplete = async () => {
    if (!tempCredentials) {
        setAuthStep('SIGN_IN'); 
        return;
    }
    
    try {
        const { profile, token } = await login(tempCredentials.email, tempCredentials.password);
        handleLoginSuccess(profile, token); 
    } catch (error) {
        console.error("Failed to auto-login after skill setup:", error);
        setAuthStep('SIGN_IN'); 
    } finally {
        setTempCredentials(null); 
    }
  };


  // Connection handlers (existing handlers are fine)
  const handleConnect = async (receiverEmail: string, message: string) => {
    try {
      const conn = await sendConnectionRequest(receiverEmail, message);
      setConnections((prev) => [...prev, conn]);
    } catch (err) {
      console.error("Failed to send connection request:", err);
    }
  };

  const handleAccept = async (connectionId: string) => {
    try {
      const updated = await acceptConnection(connectionId);
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? updated : c))
      );
    } catch (err) {
      console.error("Failed to accept connection:", err);
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      const updated = await rejectConnection(connectionId);
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? updated : c))
      );
    } catch (err) {
      console.error("Failed to reject connection:", err);
    }
  };

  // Messaging handler
  const handleSendMessage = async (receiverEmail: string, content: string) => {
    try {
      const msg = await sendMessage(receiverEmail, content);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Profile handlers 
  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    setLoading(true); // Optional: show loading state
    try {
      const [updatedUser, newSkills] = await Promise.all([
        updateProfile(updates),
        fetchSkills() // CRITICAL FIX: Re-fetch skills after profile update to sync UI
      ]);
      setUser(updatedUser);
      setSkills(newSkills); // Update skills state with fresh data
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (name: string, level: ProficiencyLevel) => {
    if (!user) return;
    try {
      const newSkill = await addSkill(name, level);
      setSkills((prev) => [...prev, newSkill]); // Optimistically update state
    } catch (err) {
      console.error("Failed to add skill:", err);
    }
  };

  const handleDeleteSkill = async (skillName: string) => {
    const originalSkills = skills;
    setSkills((prev) => prev.filter((s) => s.skill_name !== skillName)); // Optimistic delete
    try {
      await deleteSkill(skillName);
    } catch (err) {
      console.error("Failed to delete skill:", err);
      setSkills(originalSkills); // Revert on failure
    }
  };

  // Loading view
  if (loading && authStep === 'DASHBOARD') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading your dashboard...</div>
      </div>
    );
  }

  // Authentication Flow Rendering
  if (authStep !== 'DASHBOARD') {
    return (
      <BrowserRouter>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          {authStep === 'SIGN_IN' || authStep === 'REGISTER' ? (
            <AuthForm 
              onLogin={handleLoginSuccess}
              onRegistrationSuccess={handleRegistrationSuccess}
              initialFlow={authStep === 'REGISTER' ? 'REGISTER' : 'SIGN_IN'}
            />
          ) : authStep === 'ADD_SKILLS' && tempCredentials ? (
            <SkillsForm
              onSetupComplete={handleSkillsSetupComplete}
              userEmail={tempCredentials.email}
              onAddSkill={handleAddSkill} 
            />
          ) : (
            <AuthForm 
              onLogin={handleLoginSuccess}
              onRegistrationSuccess={handleRegistrationSuccess}
              initialFlow={'SIGN_IN'}
            />
          )}
        </div>
      </BrowserRouter>
    );
  }

  // Main app (logged in and in DASHBOARD step)
  const userEmail = user?.email || ""; 

  return (
    <BrowserRouter>
      <Navbar currentView={view} onViewChange={setView} onLogout={handleLogout} />
      <main className="p-6 bg-gray-50 min-h-screen">
        {view === "profile" && user && (
          <ProfileView
            profile={user}
            skills={skills} // Pass the skills state
            onUpdateProfile={handleUpdateProfile}
            onAddSkill={handleAddSkill}
            onDeleteSkill={handleDeleteSkill}
          />
        )}

        {view === "discover" && user && (
          <DiscoverView
            currentUserId={userEmail}
            profiles={profiles} // Note: DiscoverView fetches profiles internally now
            onConnect={handleConnect}
          />
        )}

        {view === "connections" && user && (
          <ConnectionsView
            currentUserId={userEmail}
            connections={connections}
            profiles={profiles}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}

        {view === "messages" && user && (
          <MessagesView
            currentUserId={userEmail}
            profiles={profiles}
            messages={messages} 
            onSendMessage={handleSendMessage}
          />
        )}
      </main>
    </BrowserRouter>
  );
};

export default App;
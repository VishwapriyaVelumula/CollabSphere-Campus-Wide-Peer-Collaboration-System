/**
 * TYPE DEFINITIONS FOR FRONTEND
 * This file centralizes all interfaces and types used across the application.
 */

// --- Profile Data Types ---

// Data structure for the full user profile fetched from the backend (GET /api/profile)
export interface Profile {
    id: string;             // Mapped from email in server.js
    email: string;          
    full_name: string;      // Mapped from 'name'
    created_at: string;     
    avatar_url: string | null;
    
    // NEW PROFILE FIELDS
    department: string | null;
    year: number | null;    // Stored as INT in DB
    bio: string | null;
    skills: string | null;  // Stored as a comma-separated string
    
    updated_at?: string;    
}

// Data structure for the registration payload (POST /api/register)
export interface RegisterData {
    email: string;
    password: string;
    name: string;
    
    // NEW PROFILE FIELDS for registration
    department?: string | null;
    year?: number | null;
    bio?: string | null;
    skills?: string | null;
}

// Data structure for profile updates (PATCH /api/profile)
// All fields are optional because we only send fields that have changed.
export interface ProfileUpdateData {
    full_name?: string;
    password?: string;
    department?: string | null;
    year?: number | null;
    bio?: string | null;
    skills?: string | null;
    avatar_url?: string | null;
}


// --- Other Application Types (Skills, etc.) ---

export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface Skill {
    id: string;
    user_email: string;
    skill_name: string;
    proficiency_level: ProficiencyLevel;
    verified: boolean;
    created_at: string;
}

export interface Connection {
    id: string;
    requester_id: string; // User ID (email)
    receiver_id: string;  // User ID (email)
    status: 'pending' | 'accepted' | 'rejected';
    message: string;
    created_at: string;
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    read: boolean;
    created_at: string;
}

export interface Endorsement {
    id: string;
    user_email: string;
    skill_name: string;
    endorser_email: string;
    created_at: string;
}

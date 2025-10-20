// src/lib/api.ts
import { setToken, getToken } from "./auth";
// Assuming these types are correctly defined in "../types"
import { Profile, Skill, Connection, Message, ProficiencyLevel } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper function for authorized fetch calls
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        // Attempt to parse JSON error message or fall back to text
        const errorBody = await res.text();
        let errorMessage = errorBody || `HTTP error! Status: ${res.status}`;
        
        // Check if the body contains a JSON message (common for Express APIs)
        try {
            const jsonError = JSON.parse(errorBody);
            // Look for a common error key like 'message' or 'error'
            errorMessage = jsonError.message || jsonError.error || errorMessage;
        } catch {
            // Not JSON, use the raw text
        }

        throw new Error(`API error (${res.status}): ${errorMessage}`);
    }

    // Handle successful response that might not have a body (like DELETE)
    if (res.status === 204 || res.headers.get("Content-Length") === "0") {
        return {} as T; 
    }

    return res.json();
}

/* =====================
    AUTH ENDPOINTS
    ===================== */

/**
 * Handles login, saves the token, and returns the full Profile object.
 */
export async function login(email: string, password: string): Promise<{ profile: Profile, token: string }> {
    const res = await apiRequest<{ token: string, user: Profile }>("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    // Returns both profile and token, which is used by App.tsx.
    return { profile: res.user, token: res.token }; 
}

/**
 * Handles registration, saves the token, and returns the full Profile object.
 */
export async function register(
    data: { 
        email: string; 
        password: string; 
        name: string; 
        department?: string | null; 
        year?: number | null; 
        bio?: string | null; 
        skills?: string | null; 
    }
): Promise<{ profile: Profile; token: string }> {
    // FIX: Ensure the API request is expecting and returning the user and token
    const res = await apiRequest<{ token: string; user: Profile }>("/api/register", {
        method: "POST",
        body: JSON.stringify(data),
    });

    // Set token immediately so subsequent API calls (like addSkill) will work
    setToken(res.token);

    // FIX: Return the profile and token
    return { profile: res.user, token: res.token };
}


/* =====================
    PROFILE ENDPOINTS
    ===================== */

export async function fetchProfile(): Promise<Profile> {
    return apiRequest<Profile>("/api/profile");
}

export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
    return apiRequest<Profile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
    });
}


/* =====================
    SKILLS ENDPOINTS
    ===================== */

export async function fetchSkills(): Promise<Skill[]> {
    // This function is correct. It should return the array of skills.
    return apiRequest<Skill[]>("/api/skills");
}

export async function addSkill(
    name: string,
    level: ProficiencyLevel,
): Promise<Skill> {
    // This function is correct. It should return the newly added skill object.
    return apiRequest<Skill>("/api/skills", {
        method: "POST",
        body: JSON.stringify({ skill_name: name, proficiency_level: level }), 
    });
}

export async function deleteSkill(skillName: string): Promise<{ success: boolean }> {
    // This function is correct.
    return apiRequest<{ success: boolean }>(`/api/skills`, {
        method: "DELETE",
        body: JSON.stringify({ skill_name: skillName }),
    });
}

/* =====================
    CONNECTION ENDPOINTS
    ===================== */
export async function fetchConnections(): Promise<Connection[]> {
    return apiRequest<Connection[]>("/api/connections");
}

export async function sendConnectionRequest(
    receiverEmail: string,
    message: string
): Promise<Connection> {
    return apiRequest<Connection>("/api/connections", {
        method: "POST",
        body: JSON.stringify({ receiver_email: receiverEmail, message }), 
    });
}

export async function acceptConnection(connectionId: string): Promise<Connection> {
    return apiRequest<Connection>(`/api/connections/${connectionId}/accept`, {
        method: "PATCH",
    });
}

export async function rejectConnection(connectionId: string): Promise<Connection> {
    return apiRequest<Connection>(`/api/connections/${connectionId}/reject`, {
        method: "PATCH",
    });
}

/* =====================
    MESSAGES ENDPOINTS
    ===================== */
export async function sendMessage(
    receiverEmail: string,
    content: string
): Promise<Message> {
    return apiRequest<Message>("/api/messages", {
        method: "POST",
        body: JSON.stringify({ receiver_email: receiverEmail, content }),
    });
}

export async function fetchMessages(): Promise<Message[]> {
    return apiRequest<Message[]>("/api/messages");
}

/* =====================
    DISCOVER / PROFILES LIST
    ===================== */

export async function fetchProfiles(): Promise<Profile[]> {
    // This is correct: it uses the API helper and the search endpoint.
    return apiRequest<Profile[]>("/api/search");
}
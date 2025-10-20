import { Profile, ProfileUpdateData, RegisterData } from "../types/index"; // FIX: Corrected path to include /index

// --- CONSTANTS ---
export const TOKEN_KEY = "skill_connect_token";
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

// --- API HELPERS ---

// Generic function to handle fetching, token authentication, and error parsing
const apiRequest = async (endpoint: string, method: string = 'GET', data?: any): Promise<any> => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        // Attempt to parse JSON error message from the backend
        const errorDetail = await response.json().catch(() => ({ message: 'Unknown error' }));
        // Format the error message to be cleaner for the frontend
        throw new Error(`API error (${response.status}): ${errorDetail.message}`);
    }
    
    // Handle 204 No Content or endpoints that don't return JSON body
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {};
    }
    
    return response.json();
};

// --- AUTHENTICATION FUNCTIONS ---

/**
 * [UPDATED] registerApi
 * Sends all new profile fields to the POST /api/register endpoint.
 */
export const registerApi = async (data: RegisterData): Promise<void> => {
    await apiRequest('/register', 'POST', data);
};

/**
 * [UPDATED] loginApi
 * Handles login, saves the token, and returns the full Profile object.
 */
export const loginApi = async (email: string, password: string): Promise<Profile> => {
    try {
        const response = await apiRequest('/login', 'POST', { email, password });

        // Only runs if the request succeeded
        setToken(response.token);
        return response.user as Profile;

    } catch (err: any) {
        // If backend returned 401 or any other error
        console.error("Login failed:", err.message);
        throw new Error(err.message || "Login failed");
    }
};


/**
 * fetchProfileApi
 * Fetches the currently logged-in user's profile data.
 */
export const fetchProfileApi = async (): Promise<Profile | null> => {
    try {
        // Backend GET /api/profile returns the Profile object directly (or null)
        const profile = await apiRequest('/profile', 'GET');
        return profile as Profile;
    } catch (e) {
        // Handle cases where the profile token is invalid or profile not found (403/404)
        if (e instanceof Error && (e.message.includes("(403)") || e.message.includes("(404)"))) {
             clearToken(); // Clear token if invalid
             return null;
        }
        throw e;
    }
};

/**
 * [NEW] updateProfileApi
 * Sends partial updates (including new profile fields) to the PATCH /api/profile endpoint.
 */
export const updateProfileApi = async (data: ProfileUpdateData): Promise<Profile> => {
    // The backend PATCH /api/profile returns the full updated profile object
    const updatedProfile = await apiRequest('/profile', 'PATCH', data);
    return updatedProfile as Profile;
};

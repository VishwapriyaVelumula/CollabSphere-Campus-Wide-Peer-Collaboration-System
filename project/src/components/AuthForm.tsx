// src/components/AuthForm.tsx

import React, { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
// FIX 1: Import the correctly named API functions
import { login, register } from "../lib/api"; 
// FIX 2: Assuming types like RegisterData are correctly imported.
import { RegisterData } from "../types"; 

// Define the shape of the credentials needed to pass between steps
interface UserCredentials {
    email: string;
    password: string;
}

// Define the state values passed via the initialFlow prop
type AuthFlowState = 'SIGN_IN' | 'REGISTER';

interface AuthFormProps {
    // FIX 3: Prop name is 'onLogin'
    onLogin: (profile: any, token: string) => void; 
    onRegistrationSuccess: (credentials: UserCredentials) => void;
    // FIX 4: Added the required 'initialFlow' prop definition.
    initialFlow: AuthFlowState;
}

// Define possible departments and years for dropdowns
const DEPARTMENTS = ["Computer Science", "Cyber Security", "AIML", "AIDS", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Physics", "Chemistry", "Mathematics", "Other"];
const YEARS = [1, 2, 3, 4];

// FIX 5: Accept the new 'initialFlow' prop
export default function AuthForm({ onLogin, onRegistrationSuccess, initialFlow }: AuthFormProps) {
    
    // FIX 6: Use initialFlow to set the state correctly
    const [isSignUp, setIsSignUp] = useState(initialFlow === 'REGISTER'); 
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");

    // --- PROFILE FIELDS STATE ---
    const [department, setDepartment] = useState(DEPARTMENTS[0]);
    const [year, setYear] = useState(String(YEARS[0]));
    // ----------------------------

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignUp) {
                // --- REGISTRATION LOGIC ---
                
                if (!department || !year) {
                    setError("Department and Academic Year are required.");
                    setLoading(false);
                    return;
                }

                // FIX 7: Use the imported 'register' function
                await register({
                    email,
                    password,
                    name: fullName,
                    department,
                    year: parseInt(year), 
                } as RegisterData); 

                onRegistrationSuccess({ email, password });
                
            } else {
                // --- SIGN IN LOGIC ---
                // FIX 8: Use the imported 'login' function. It must return { profile, token }
                const { profile, token } = await login(email, password); 
                
                // FIX 9: The prop is correctly named 'onLogin'
                onLogin(profile, token); 
            }
        } catch (err: unknown) {
            setLoading(false); 
            
            const errorMessage = err instanceof Error ? err.message.replace(/API error \(.*\): /, '') : "Authentication failed";
            setError(errorMessage);
        } finally {
             // Only stop loading if we are NOT moving to the next step (registration success)
            if (!isSignUp) { 
                 setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                        <span className="text-3xl font-bold text-white">C</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">CollabSphere</h1>
                    <p className="text-gray-600">Connect. Collaborate. Create.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(false)}
                            className={`flex-1 py-2 rounded-md font-medium transition-all ${
                                !isSignUp ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSignUp(true)}
                            className={`flex-1 py-2 rounded-md font-medium transition-all ${
                                isSignUp ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <>
                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>

                                {/* Department Dropdown */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                                    <select
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                        required
                                    >
                                        {DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Year Dropdown */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                                    <select
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                        required
                                    >
                                        {YEARS.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Email Input (Common) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="you@university.edu"
                                required
                            />
                        </div>

                        {/* Password Input (Common) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span>Processing...</span>
                            ) : isSignUp ? (
                                <>
                                    <UserPlus size={20} />
                                    Create Account
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
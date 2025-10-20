// src/components/DiscoverView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Profile, ProficiencyLevel } from '../types'; 
import { fetchProfiles } from '../lib/api'; 
import { Search, UserX, Send } from 'lucide-react';

// Define a robust type for a skill object (Needed for reference, but we handle dynamic data)
interface UserSkill {
    skill_name: string;
    proficiency_level: ProficiencyLevel;
}

interface DiscoverViewProps {
    currentUserId: string; 
    profiles: Profile[]; 
    onConnect: (receiverEmail: string, message: string) => void;
}

const DiscoverView: React.FC<DiscoverViewProps> = ({ currentUserId, onConnect }) => {
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Helper function to safely extract a skill name, handling both string and object formats
    // FIX: Simplified helper function signature and logic for robustness
    const getSkillName = (skill: any): string | null => {
        if (typeof skill === 'string') {
            return skill;
        }
        // Check for object structure using type assertion/guard for 'skill_name'
        if (skill && typeof skill === 'object' && 'skill_name' in skill && typeof skill.skill_name === 'string') {
            return skill.skill_name;
        }
        return null;
    };

    // 1. Fetch all profiles (excluding the current user)
    const loadProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchProfiles();
            const filteredProfiles = data.filter(p => p.email && p.email !== currentUserId);
            setAllProfiles(filteredProfiles);
        } catch (err) {
            console.error("Failed to fetch profiles:", err);
            const errorMessage = err instanceof Error ? err.message : "Could not load users.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    // 2. Filter profiles based on the search term
    const filteredProfiles = useMemo(() => {
        if (!searchTerm) {
            return allProfiles;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();

        return allProfiles.filter(profile => {
            // Check for basic fields
            const matchesName = profile.full_name?.toLowerCase().includes(lowerSearchTerm);
            const matchesDepartment = profile.department?.toLowerCase().includes(lowerSearchTerm);
            const matchesYear = String(profile.year || '').includes(lowerSearchTerm);

            // FIX: Robust skill search using .some()
            const matchesSkills = profile.skills?.some(skill => {
                const skillName = getSkillName(skill);
                return skillName?.toLowerCase().includes(lowerSearchTerm);
            });

            return matchesName || matchesDepartment || matchesYear || matchesSkills;
        });
    }, [allProfiles, searchTerm]);

    // 3. Simple Card Component for User Display (internal to DiscoverView)
    const ProfileCard: React.FC<{ profile: Profile }> = ({ profile }) => {
        const [connectMessage, setConnectMessage] = useState('');
        const [isSending, setIsSending] = useState(false);
        const [sendStatus, setSendStatus] = useState<'idle' | 'sent' | 'error'>('idle');

        const handleConnect = async () => {
            setIsSending(true);
            try {
                await onConnect(profile.email, connectMessage || `Hi ${profile.full_name || 'there'}, I'd like to connect regarding skills and projects.`);
                setSendStatus('sent');
                setTimeout(() => setSendStatus('idle'), 3000); // Reset status after 3s
            } catch (error) {
                setSendStatus('error');
                setTimeout(() => setSendStatus('idle'), 3000); 
            } finally {
                setIsSending(false);
            }
        };

        // FIX: Safely extract skills for display (resolves .map and .filter errors)
        const displayedSkills = (profile.skills || [])
            .map(getSkillName)
            // FIX: Corrected filter syntax using type predicate (or simple boolean check)
            .filter((name): name is string => name !== null && name !== '');


        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {profile.full_name ? profile.full_name[0] : 'U'}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">{profile.full_name || 'No Name'}</h3>
                            {/* Display Department and Year */}
                            <p className="text-sm text-gray-500">
                                {profile.department || 'General'}
                                {profile.year ? ` | Year ${profile.year}` : ''}
                            </p>
                        </div>
                    </div>
                </div>
                
                <p className="text-gray-700 mt-3 text-sm italic line-clamp-2">{profile.bio || 'This user has not provided a bio yet.'}</p>
                
                <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                        {/* FIX: Safely map over the cleaned array (resolved .map error) */}
                        {displayedSkills.slice(0, 3).map((skillName, index) => (
                            <span key={index} className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                {skillName}
                            </span>
                        ))}
                        {displayedSkills.length > 3 && (
                            <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                +{displayedSkills.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <textarea
                        value={connectMessage}
                        onChange={(e) => setConnectMessage(e.target.value)}
                        placeholder="Send a personalized connection message..."
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-2 resize-none"
                        rows={2}
                    />
                    <button
                        onClick={handleConnect}
                        disabled={isSending || sendStatus === 'sent'}
                        className={`w-full py-2 rounded-lg font-semibold transition duration-150 flex items-center justify-center gap-2 
                            ${isSending ? 'bg-gray-400 cursor-not-allowed' : ''}
                            ${sendStatus === 'sent' ? 'bg-green-500 text-white cursor-not-allowed' : ''}
                            ${sendStatus === 'error' ? 'bg-red-500 text-white' : ''}
                            ${sendStatus === 'idle' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                        `}
                    >
                        {isSending ? 'Sending...' : sendStatus === 'sent' ? 'Request Sent!' : sendStatus === 'error' ? 'Failed (Retry)' : <>Connect <Send size={16} /></>}
                    </button>
                </div>
            </div>
        );
    };

    // 4. Render Logic
    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Discover Collaborators</h2>

            {/* Search Bar */}
            <div className="mb-8 p-4 bg-white rounded-xl shadow-md flex items-center border border-gray-200">
                <Search className="text-gray-400 mr-3" size={20} />
                <input
                    type="text"
                    placeholder="Search users by Name, Department, Year, or Skill..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-lg border-none focus:ring-0 placeholder-gray-500"
                />
            </div>

            {loading && (
                <div className="text-center text-lg text-blue-600">Loading potential collaborators...</div>
            )}

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-3">
                    <UserX size={20} /> {error}
                </div>
            )}

            {!loading && !error && filteredProfiles.length === 0 && (
                <div className="p-10 text-center bg-white rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700">No Users Found</h3>
                    <p className="text-gray-500 mt-2">Try a different search term or check back later!</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfiles.map(profile => (
                    <ProfileCard key={profile.email} profile={profile} />
                ))}
            </div>
        </div>
    );
};

export default DiscoverView;
// src/components/SkillsForm.tsx
import React, { useState } from "react";
// Assuming ProficiencyLevel is correctly defined in your types file
import { ProficiencyLevel } from "../types"; 

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ["Beginner", "Intermediate", "Advanced", "Expert"];

interface CollectedSkill {
    name: string;
    level: ProficiencyLevel;
}

interface SkillsFormProps {
    onSetupComplete: () => void;
    userEmail: string; // Used for context, not directly in this logic
    onAddSkill: (name: string, level: ProficiencyLevel) => Promise<void>; // Prop to call the API
}

const SkillsForm: React.FC<SkillsFormProps> = ({ onSetupComplete, userEmail, onAddSkill }) => {
    const [newSkillName, setNewSkillName] = useState("");
    const [newSkillLevel, setNewSkillLevel] = useState<ProficiencyLevel>("Beginner");
    const [currentSkills, setCurrentSkills] = useState<CollectedSkill[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    const handleAddSkillToList = () => {
        const trimmedName = newSkillName.trim();
        if (!trimmedName) {
            setMessage("Skill name cannot be empty.");
            return;
        }

        if (currentSkills.some(skill => skill.name.toLowerCase() === trimmedName.toLowerCase())) {
            setMessage(`Skill "${trimmedName}" has already been added.`);
            return;
        }

        setCurrentSkills(prev => [...prev, { name: trimmedName, level: newSkillLevel }]);
        setNewSkillName("");
        setNewSkillLevel("Beginner");
        setMessage("");
    };

    const handleRemoveSkill = (index: number) => {
        setCurrentSkills(prev => prev.filter((_, i) => i !== index));
        setMessage("");
    };

    const handleSaveAndComplete = async () => {
        if (currentSkills.length === 0) {
            setMessage("Please add at least one skill or click Skip.");
            return;
        }

        setIsSaving(true);
        setMessage("Saving skills. Please wait...");

        try {
            // Use Promise.allSettled for robust handling of multiple API calls
            const results = await Promise.allSettled(
                currentSkills.map(skill => onAddSkill(skill.name, skill.level))
            );

            const failedCount = results.filter(r => r.status === 'rejected').length;
            const successCount = currentSkills.length - failedCount;

            if (failedCount > 0) {
                // Log detailed errors for debugging
                results.filter(r => r.status === 'rejected').forEach((r, i) => {
                    if (r.status === 'rejected') {
                        console.error(`Skill save failed for skill #${i}:`, r.reason);
                    }
                });
                setMessage(`WARNING: Saved ${successCount} skill(s), but ${failedCount} failed to save.`);
                // We still call onSetupComplete to transition the user, 
                // but keep the error message visible for a moment.
            } else {
                setMessage(`Successfully saved ${successCount} skill${successCount !== 1 ? "s" : ""}!`);
            }
            
            // Allow a brief moment for the user to see the success/warning message
            setTimeout(() => onSetupComplete(), 500); 

        } catch (err: any) {
            // This catch block would only be hit if the map or Promise.allSettled failed entirely (very unlikely)
            console.error("Critical error during skills save process:", err);
            setMessage(`Critical error: ${err?.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto">
            <h2 className="text-3xl font-extrabold text-indigo-700 mb-6 text-center">Setup Your Skills</h2>
            <p className="text-sm text-center text-gray-600 mb-4">You are setting up skills for: <span className="font-semibold">{userEmail}</span></p>

            {message && (
                <div
                    className={`p-3 mb-4 rounded-lg text-sm font-medium ${
                        message.includes("failed") || message.includes("Critical")
                            ? "bg-red-100 text-red-700"
                            : message.includes("already been added")
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-700"
                    }`}
                >
                    {message}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-6 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700">Skill Name</label>
                    <input
                        type="text"
                        value={newSkillName}
                        onChange={e => setNewSkillName(e.target.value)}
                        placeholder="e.g., Python, React"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                        disabled={isSaving}
                    />
                </div>

                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-gray-700">Proficiency</label>
                    <select
                        value={newSkillLevel}
                        onChange={e => setNewSkillLevel(e.target.value as ProficiencyLevel)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition bg-white"
                        disabled={isSaving}
                    >
                        {PROFICIENCY_LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleAddSkillToList}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
                    disabled={!newSkillName.trim() || isSaving}
                >
                    Add Skill
                </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {currentSkills.length > 0 ? (
                    currentSkills.map((skill, index) => (
                        <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                        >
                            <div>
                                <p className="font-semibold text-gray-800">{skill.name}</p>
                                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                    {skill.level}
                                </span>
                            </div>
                            <button
                                onClick={() => handleRemoveSkill(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition"
                                disabled={isSaving}
                                aria-label="Remove skill"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 italic text-center py-4">Add your first skill above.</p>
                )}
            </div>

            <div className="mt-8 flex gap-4">
                <button
                    onClick={handleSaveAndComplete}
                    className="flex-1 py-3 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    disabled={currentSkills.length === 0 || isSaving}
                >
                    {isSaving ? "Saving..." : "Save & Continue"}
                </button>

                <button
                    onClick={onSetupComplete}
                    className="flex-1 py-3 bg-gray-300 text-gray-800 font-bold text-lg rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                    disabled={isSaving}
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

export default SkillsForm;
import React, { useState } from "react";
// Assuming types are correctly imported
import { Profile, Skill, ProficiencyLevel } from "../types"; 
import { Edit2, Save, X, PlusCircle, Trash2 } from "lucide-react";

// --- Types & Constants ---
const PROFICIENCY_LEVELS: ProficiencyLevel[] = ["Beginner", "Intermediate", "Advanced", "Expert"];
const DEPARTMENTS = ["Computer Science", "Cyber Security", "AIML", "AIDS", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Physics", "Chemistry", "Mathematics", "Other"];
const YEARS = [1, 2, 3, 4];

interface ProfileViewProps {
  profile: Profile;
  skills: Skill[]; // This is the array we need to display
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
  onAddSkill: (name: string, level: ProficiencyLevel) => Promise<void>;
  onDeleteSkill: (skillName: string) => Promise<void>;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, skills, onUpdateProfile, onAddSkill, onDeleteSkill }) => {
  // --- Profile Edit State (Initialized from props) ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedBio, setEditedBio] = useState(profile.bio || "");
  const [editedDepartment, setEditedDepartment] = useState(profile.department || DEPARTMENTS[0]);
  const [editedYear, setEditedYear] = useState(profile.year ? String(profile.year) : String(YEARS[0]));
  const [profileLoading, setProfileLoading] = useState(false);

  // --- Skill Add State ---
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<ProficiencyLevel>("Beginner");
  const [skillActionLoading, setSkillActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Handlers ---
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setError(null);
    try {
      const updates: Partial<Profile> = {
        bio: editedBio.trim(),
        department: editedDepartment,
        year: parseInt(editedYear),
      };
      await onUpdateProfile(updates);
      setIsEditingProfile(false);
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message || "Unknown error"}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddSkill = async () => {
    const trimmedName = newSkillName.trim();
    if (!trimmedName) {
      setError("Skill name cannot be empty.");
      return;
    }
    if (skills.some(s => s.skill_name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Skill already exists.");
      return;
    }

    setSkillActionLoading(true);
    setError(null);
    try {
      // Calls App.tsx which in turn calls API and updates main skills state
      await onAddSkill(trimmedName, newSkillLevel); 
      setNewSkillName("");
      setNewSkillLevel("Beginner");
      setIsAddingSkill(false);
    } catch (err: any) {
      setError(`Failed to add skill: ${err.message || "Unknown error"}`);
    } finally {
      setSkillActionLoading(false);
    }
  };

  const handleDeleteSkill = async (skillName: string) => {
    setSkillActionLoading(true);
    setError(null);
    try {
      await onDeleteSkill(skillName);
    } catch (err: any) {
      setError(`Failed to delete skill: ${err.message || "Unknown error"}`);
    } finally {
      setSkillActionLoading(false);
    }
  };

  // --- Render Profile Info Block (View Mode) ---
  const renderProfileInfo = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h3 className="text-2xl font-bold text-gray-800">Personal Details</h3>
        <button
          onClick={() => {
            setEditedBio(profile.bio || "");
            setEditedDepartment(profile.department || DEPARTMENTS[0]);
            setEditedYear(profile.year ? String(profile.year) : String(YEARS[0]));
            setError(null);
            setIsEditingProfile(true);
          }}
          className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
          disabled={profileLoading}
        >
          <Edit2 size={16} className="mr-1" /> Edit Profile
        </button>
      </div>

      {/* NEW LAYOUT: Name and Email Side-by-Side (Top Row) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">FULL NAME</p>
          <p className="text-xl text-gray-900">{profile.full_name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">EMAIL</p>
          <p className="text-gray-800 text-lg">{profile.email}</p>
        </div>
      </div>

      {/* NEW LAYOUT: Department and Academic Year Side-by-Side (Second Row) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">DEPARTMENT</p>
          <p className="text-gray-800">{profile.department || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">ACADEMIC YEAR</p>
          <p className="text-gray-800">{profile.year || "N/A"}</p>
        </div>
       
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-500 mb-1">BIO</p>
        <p className="text-gray-700 italic">{profile.bio || "No biography provided. Click 'Edit Profile' to add one."}</p>
      </div>
    </div>
  );

  // --- Render Profile Edit Form ---
  const renderProfileEditForm = () => (
    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-indigo-700 mb-6 border-b pb-4">Edit Profile</h3>

      {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

      <div className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              value={editedDepartment}
              onChange={e => setEditedDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white appearance-none"
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Academic Year</label>
            <select
              value={editedYear}
              onChange={e => setEditedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white appearance-none"
            >
              {YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={editedBio}
            onChange={e => setEditedBio(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            placeholder="Tell us about yourself, your interests, and what you're looking for."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => setIsEditingProfile(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
            disabled={profileLoading}
          >
            <X size={16} className="inline mr-1" /> Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center"
            disabled={profileLoading}
          >
            {profileLoading ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save size={16} className="inline mr-1" /> Save Changes
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );

  // --- Render Skills List ---
  const renderSkillsList = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <h3 className="text-2xl font-bold text-gray-800">My Skills ({skills.length})</h3> 
        <button
          onClick={() => setIsAddingSkill(prev => !prev)}
          className="flex items-center text-green-600 hover:text-green-800 font-medium transition duration-150"
          disabled={skillActionLoading}
        >
          <PlusCircle size={16} className="mr-1" /> {isAddingSkill ? "Hide Form" : "Add New Skill"}
        </button>
      </div>

      {/* Add Skill Form */}
      {isAddingSkill && (
        <div className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-3">Add Skill</h4>
          <div className="flex space-x-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600">Name</label>
              <input
                type="text"
                value={newSkillName}
                onChange={e => setNewSkillName(e.target.value)}
                placeholder="e.g., JavaScript, Figma"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={skillActionLoading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Proficiency</label>
              <select
                value={newSkillLevel}
                onChange={e => setNewSkillLevel(e.target.value as ProficiencyLevel)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                disabled={skillActionLoading}
              >
                {PROFICIENCY_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddSkill}
              className="px-4 py-1.5 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition text-sm disabled:opacity-50 flex items-center"
              disabled={skillActionLoading || !newSkillName.trim()}
            >
              <PlusCircle size={16} className="mr-1" /> Add
            </button>
          </div>
        </div>
      )}

      {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

      {/* Skills List - THIS SECTION DISPLAYS THE SKILLS */}
      {skills.length > 0 ? (
        <div className="space-y-3">
          {skills.map(skill => (
            <div
              key={skill.skill_name}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <p className="font-semibold text-gray-800">{skill.skill_name}</p>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  skill.proficiency_level === 'Expert' ? 'bg-purple-100 text-purple-800' :
                  skill.proficiency_level === 'Advanced' ? 'bg-blue-100 text-blue-800' :
                  skill.proficiency_level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {skill.proficiency_level}
                </span>
              </div>
              <button
                onClick={() => handleDeleteSkill(skill.skill_name)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition disabled:opacity-50"
                disabled={skillActionLoading}
                aria-label={`Remove ${skill.skill_name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic text-center py-4">No skills added yet. Add your first one above!</p>
      )}
    </div>
  );

  // --- Component Return ---
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

      {isEditingProfile ? (
        renderProfileEditForm()
      ) : (
        <>
          {renderProfileInfo()}
          {renderSkillsList()}
        </>
      )}
      </div>
  );
};

export default ProfileView;
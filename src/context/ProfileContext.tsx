import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export const STORAGE_KEY = "sar_guardian_profile";

export interface UserProfile {
  name: string;
  email: string;
  mobile: string;
  role: string;
  photoUrl: string;
  isVerified: boolean;
  department: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "J. Morrison",
  email: "j.morrison@barclays.com",
  mobile: "+44 20 7116 1000",
  role: "Senior Analyst",
  photoUrl: "",
  isVerified: false,
  department: "Financial Crimes Compliance",
};

interface ProfileContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  saveProfile: (profile: UserProfile) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: DEFAULT_PROFILE,
  setProfile: () => {},
  saveProfile: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(e.newValue) });
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setProfile = (p: UserProfile) => setProfileState(p);

  const saveProfile = (p: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfileState(p);
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

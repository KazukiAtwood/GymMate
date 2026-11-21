import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

import { getUserProfile } from "@/services/profileService";
import type { SportProfile } from "@/types/profile";

import { auth } from "../services/firebase";

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  profile: SportProfile | null;
  profileLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<SportProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedUid = useRef<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const account = auth.currentUser;

    if (!account) {
      setProfile(null);
      setError(null);
      return false;
    }

    try {
      const nextProfile = await getUserProfile(account.uid);

      if (auth.currentUser?.uid !== account.uid) {
        return false;
      }

      loadedUid.current = account.uid;
      setProfile(nextProfile);
      setError(null);
      return true;
    } catch (loadError) {
      console.error("Erreur lors du chargement du profil :", loadError);

      if (auth.currentUser?.uid !== account.uid) {
        return false;
      }

      setError("Impossible de charger votre profil.");
      return false;
    }
  }, []);

  useEffect(() => {
    let requestId = 0;

    const unsubscribe = onAuthStateChanged(auth, (account) => {
      setUser(account);

      if (!account) {
        requestId += 1;
        loadedUid.current = null;
        setProfile(null);
        setError(null);
        setProfileLoading(false);
        setInitializing(false);
        return;
      }

      if (loadedUid.current === account.uid) {
        setInitializing(false);
        return;
      }

      const currentRequest = ++requestId;
      loadedUid.current = account.uid;
      setProfile(null);
      setError(null);
      setProfileLoading(true);

      void getUserProfile(account.uid)
        .then((nextProfile) => {
          if (currentRequest !== requestId) {
            return;
          }

          setProfile(nextProfile);
        })
        .catch((loadError) => {
          console.error("Erreur lors du chargement du profil :", loadError);

          if (currentRequest !== requestId) {
            return;
          }

          if (loadedUid.current === account.uid) {
            loadedUid.current = null;
          }

          setError("Impossible de charger votre profil.");
        })
        .finally(() => {
          if (currentRequest !== requestId) {
            return;
          }

          setProfileLoading(false);
          setInitializing(false);
        });
    });

    return () => {
      requestId += 1;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        profile,
        profileLoading,
        error,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé à l’intérieur de AuthProvider.");
  }

  return context;
}

import { createContext, useContext, useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [initializing, setInitializing] = useState(true);

  const [profile, setProfile] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);

  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (account) => {
      setUser(account);
      setProfile(null);
      setError(null);

      if (!account) {
        setProfileLoading(false);
        setInitializing(false);
        return;
      }

      setProfileLoading(true);

      try {
        const profileRef = doc(db, "users", account.uid);

        const profileSnapshot = await getDoc(profileRef);

        if (profileSnapshot.exists()) {
          setProfile({
            id: profileSnapshot.id,
            ...profileSnapshot.data(),
          });
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Erreur lors du chargement du profil :", err);

        setError("Impossible de charger votre profil.");
      } finally {
        setProfileLoading(false);
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    initializing,
    profile,
    profileLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé à l’intérieur de AuthProvider.");
  }

  return context;
}

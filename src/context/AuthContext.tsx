import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AuthState } from '../types';
import { auth as fbAuth, db } from '../lib/firebase';
import { onAuthStateChanged, signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  auth: AuthState;
  login: (password: string) => Promise<boolean>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (role: 'admin' | 'distributor', newPassword: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({ role: 'citizen', isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ admin: '', distributor: '' });

  useEffect(() => {
    // 1. Initial anonymous sign in if not already signed in
    const unsubscribeAuth = onAuthStateChanged(fbAuth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(fbAuth);
        } catch (err) {
          console.error("Anonymous sign-in failed", err);
        }
      } else {
        // 2. Check if user is staff (admin/distributor)
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));
        if (staffDoc.exists()) {
          setAuth({ role: staffDoc.data().role as UserRole, isAuthenticated: true });
        } else {
          // Check for whitelisted email (the site owner)
          if (user.email === 'khlmoataz@gmail.com') {
            await setDoc(doc(db, 'staff', user.uid), { role: 'admin', email: user.email });
            setAuth({ role: 'admin', isAuthenticated: true });
          } else {
            // Check local storage for persistent role if they did PIN login
            const saved = localStorage.getItem('auth_state');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.isAuthenticated) {
                setAuth(parsed);
              }
            }
          }
        }
      }
      setLoading(false);
    });

    // 3. Listen to settings/passwords
    const unsubscribePasswords = onSnapshot(doc(db, 'settings', 'passwords'), (snapshot) => {
      if (snapshot.exists()) {
        setPasswords(snapshot.data() as any);
      } else {
        // Initialize defaults for a new setup
        const defaults = { admin: '123456', distributor: '1234' };
        setDoc(doc(db, 'settings', 'passwords'), defaults).catch(console.error);
        setPasswords(defaults);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribePasswords();
    };
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      localStorage.setItem('auth_state', JSON.stringify(auth));
    }
  }, [auth]);

  const login = async (password: string): Promise<boolean> => {
    // Check PINs
    let role: UserRole | null = null;
    if (password === passwords.admin) {
      role = 'admin';
    } else if (password === passwords.distributor) {
      role = 'distributor';
    }

    if (role && fbAuth.currentUser) {
      const newAuth = { role, isAuthenticated: true };
      setAuth(newAuth);
      
      // Persist to staff collection for this UID so rules work
      try {
        await setDoc(doc(db, 'staff', fbAuth.currentUser.uid), { 
          role, 
          type: 'pin_login',
          last_login: new Date().toISOString() 
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update staff record", err);
      }
      
      return true;
    }
    return false;
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(fbAuth, provider);
    } catch (err) {
      console.error("Google login failed", err);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(fbAuth);
    setAuth({ role: 'citizen', isAuthenticated: false });
    localStorage.removeItem('auth_state');
    // Sign back in anonymously for guest browsing
    await signInAnonymously(fbAuth);
  };

  const updatePassword = async (role: 'admin' | 'distributor', newPassword: string) => {
    await setDoc(doc(db, 'settings', 'passwords'), { [role]: newPassword }, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ auth, login, googleLogin, logout, updatePassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        setUser({ ...authUser, profile: userDoc.data() });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const generateUniqueCode = async () => {
    let code;
    let exists = true;
    
    while (exists) {
      code = 'SK' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const q = query(collection(db, 'users'), where('identificationCode', '==', code));
      const querySnapshot = await getDocs(q);
      exists = !querySnapshot.empty;
    }
    
    return code;
  };

  const register = async (userData) => {
    try {
      const identificationCode = await generateUniqueCode();
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        fullName: userData.fullName,
        gender: userData.gender,
        birthYear: userData.birthYear,
        phone: userData.phone,
        email: userData.email,
        username: userData.username,
        identificationCode,
        createdAt: new Date(),
        participatedActivities: [],
        yukataDesign: null,
        mangaSubmissions: [],
      });

      return { success: true, user: userCredential.user, code: identificationCode };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

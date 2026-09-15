"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { auth, db } from "../utils/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

export const AuthContext = createContext();

const SESSION_TIMEOUT = 180 * 60 * 1000; // ⚡ 180-Minute Production Pulse

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isLoggingIn = useRef(false);

  // Update last interaction timestamp
  const updateActivity = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ms_last_active", Date.now().toString());
    }
  }, []);

  // Check for session timeout
  const checkSession = useCallback(() => {
    if (typeof window === "undefined") return true;

    const lastActive = localStorage.getItem("ms_last_active");
    if (lastActive) {
      const now = Date.now();
      if (now - parseInt(lastActive) > SESSION_TIMEOUT) {
        console.log("Session expired. Logging out...");
        handleLogout("session_expired");
        return false;
      }
    }
    return true;
  }, []);

  useEffect(() => {
    setMounted(true);

    // Initialize Persistence
    setPersistence(auth, browserLocalPersistence);

    // Removed Dark mode theme logic
    document.documentElement.classList.remove("dark");

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsInitializing(true);

      if (firebaseUser) {
        if (!checkSession()) {
          setIsInitializing(false);
          setLoading(false);
          return;
        }

        const getFingerprint = () => {
          if (typeof window === "undefined") return "server";
          const nav = window.navigator;
          const screen = window.screen;
          return btoa(
            [
              nav.userAgent,
              nav.language,
              screen.width,
              screen.height,
              screen.colorDepth,
            ].join("|"),
          );
        };
        const currentDeviceId = getFingerprint();

        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();

              // 🚫 Ironclad Session Collision Enforcement
              const isLocalhost =
                typeof window !== "undefined" &&
                window.location.hostname === "localhost";
              
              // Grace period: If the user just logged in (within 60s), skip collision check
              // to avoid race conditions between login update and snapshot listener.
              const lastLoginTime = typeof data.lastLogin?.toMillis === "function"
                ? data.lastLogin.toMillis()
                : (data.lastLogin ? new Date(data.lastLogin).getTime() : Date.now());
              const isFreshSession = (Date.now() - lastLoginTime) < 60000;

              if (
                !isLocalhost &&
                !isFreshSession &&
                !isLoggingIn.current &&
                data.deviceId &&
                data.deviceId !== currentDeviceId
              ) {
                console.warn(
                  "🔐 Session Collision Detected: Persistent device ID mismatch. Terminating session...",
                );
                handleLogout("session_collision");
                return;
              }

              // Sync device ID if not present
              if (!data.deviceId) {
                setDoc(userDocRef, {
                  deviceId: currentDeviceId,
                  lastSync: serverTimestamp(),
                }, { merge: true }).catch(err => console.warn("Sync deviceId warning:", err));
              }

              setUser({
                uid: firebaseUser.uid,
                name: data.name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Student"),
                email: firebaseUser.email,
                role: data.role || (firebaseUser.email === 'nodesandeep@gmail.com' ? 'admin' : 'student'),
                status: data.status || "active",
                phone: data.phone || "",
                enrolledCourses: data.enrolledCourses || [],
                savedQuestions: data.savedQuestions || [],
                xp: data.totalXP || data.xp || 0,
                streak: data.streak || 0,
                lastActive: data.lastActive || null,
              });
              updateActivity();
            } else {
              // Safety fallback if Firestore user doc does not exist yet for ANY user
              const isMaster = firebaseUser.email === 'nodesandeep@gmail.com';
              const fallbackUser = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : (isMaster ? "Master Admin" : "Student")),
                email: firebaseUser.email,
                role: isMaster ? 'admin' : 'student',
                status: 'active',
                phone: "",
                enrolledCourses: [],
                savedQuestions: [],
                xp: 0,
                streak: 0,
              };
              setUser(fallbackUser);
              
              // Auto-seed user document in Firestore to prevent future empty reads
              setDoc(userDocRef, {
                name: fallbackUser.name,
                email: firebaseUser.email,
                role: fallbackUser.role,
                status: "active",
                deviceId: currentDeviceId,
                enrolledCourses: [],
                savedQuestions: [],
                xp: 0,
                streak: 0,
                lastLogin: serverTimestamp(),
                createdAt: serverTimestamp(),
              }, { merge: true }).catch(e => console.warn("Auto-create fallback user doc warning:", e));
            }
            setLoading(false);
            setIsInitializing(false);
          },
          (err) => {
            console.error("User Doc Sync Error:", err);
            // Even on error, if we have a firebaseUser, let them in
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
              email: firebaseUser.email,
              role: firebaseUser.email === 'nodesandeep@gmail.com' ? 'admin' : 'student',
              status: 'active',
              enrolledCourses: [],
              savedQuestions: [],
              xp: 0,
              streak: 0,
            });
            setLoading(false);
            setIsInitializing(false);
          },
        );

        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setLoading(false);
        setIsInitializing(false);
      }
    });

    // Activity listeners for sliding timeout (Aggressive pulse)
    const events = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];
    const handleActivity = () => {
      // We throttle activity updates to avoid localStorage spam
      const now = Date.now();
      const lastUpdate = localStorage.getItem("ms_last_pulse") || 0;
      if (now - lastUpdate > 30000) {
        // Update every 30s of activity
        updateActivity();
        localStorage.setItem("ms_last_pulse", now.toString());
      }
    };
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Periodic check (every 1 min for high precision)
    const interval = setInterval(checkSession, 60 * 1000);

    return () => {
      unsubscribeAuth();
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      clearInterval(interval);
    };
  }, [checkSession, updateActivity]);

  const handleLogout = async (reason = "") => {
    try {
      await signOut(auth);
      localStorage.removeItem("ms_last_active");
      localStorage.removeItem("ms_session_master");
      setUser(null);

      // Force string type to prevent [object Object] in URL
      const reasonStr = typeof reason === "string" ? reason : "";
      const redirectParam = reasonStr
        ? `?reason=${encodeURIComponent(reasonStr)}`
        : "";

      // Use window.location for hard reload to clear any residual memory state
      window.location.href = `/login${redirectParam}`;
    } catch (err) {
      console.error("Logout Error:", err);
      window.location.href = "/login";
    }
  };

  const login = async (email, password, remember = false) => {
    isLoggingIn.current = true;
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserLocalPersistence,
      );
      
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const getFingerprint = () => {
        if (typeof window === "undefined") return "server";
        const nav = window.navigator;
        const screen = window.screen;
        return btoa(
          [
            nav.userAgent,
            nav.language,
            screen.width,
            screen.height,
            screen.colorDepth,
          ].join("|"),
        );
      };
      const currentDeviceId = getFingerprint();

      // Ensure user doc exists for admins
      const userRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        const isMaster = email === "nodesandeep@gmail.com";
        await setDoc(userRef, {
          name: cred.user.displayName || email.split("@")[0],
          email: email,
          role: isMaster ? "admin" : "student",
          status: "active",
          deviceId: currentDeviceId,
          enrolledCourses: [],
          savedQuestions: [],
          xp: 0,
          streak: 0,
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(
          userRef,
          {
            deviceId: currentDeviceId,
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      }

      updateActivity();
      
      // Delay resetting the flag to allow snapshots to process the update
      setTimeout(() => {
        isLoggingIn.current = false;
      }, 5000);

      return cred.user;
    } catch (err) {
      isLoggingIn.current = false;
      throw err;
    }
  };

  const signInWithGoogle = async (phoneData = null) => {
    isLoggingIn.current = true;
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });
      
      const cred = await signInWithPopup(auth, provider);
      const firebaseUser = cred.user;
      const uid = firebaseUser.uid;

      const getFingerprint = () => {
        if (typeof window === "undefined") return "server";
        const nav = window.navigator;
        const screen = window.screen;
        return btoa(
          [
            nav.userAgent,
            nav.language,
            screen.width,
            screen.height,
            screen.colorDepth,
          ].join("|"),
        );
      };
      const currentDeviceId = getFingerprint();

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const isMaster = firebaseUser.email === "nodesandeep@gmail.com";
        const userPhone = phoneData?.phone ? phoneData.phone.replace(/\D/g, '') : "";
        const userCountryCode = phoneData?.countryCode || "+977";
        const userWhatsapp = phoneData?.whatsappOptedIn ?? false;

        const newUser = {
          name: firebaseUser.displayName || "Google Candidate",
          email: firebaseUser.email,
          role: isMaster ? "admin" : "student",
          status: "active",
          phone: userPhone ? `${userCountryCode}${userPhone}` : "",
          enrolledCourses: [],
          savedQuestions: [],
          xp: 0,
          streak: 0,
          deviceId: currentDeviceId,
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, newUser);

        // Sync shadow record to Turso in the background
        try {
          const token = await firebaseUser.getIdToken();
          if (token) {
            await fetch("/api/profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                displayName: newUser.name,
                countryCode: userCountryCode,
                phone: userPhone,
                whatsappOptedIn: userWhatsapp,
              }),
            });
          }
        } catch (profileErr) {
          console.warn("[Google Auth] Initial Turso sync skipped:", profileErr.message);
        }
      } else {
        await updateDoc(userRef, {
          deviceId: currentDeviceId,
          lastLogin: serverTimestamp(),
        });
      }

      updateActivity();

      setTimeout(() => {
        isLoggingIn.current = false;
      }, 5000);

      return firebaseUser;
    } catch (err) {
      isLoggingIn.current = false;
      throw err;
    }
  };

  const signUp = async (name, email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const newUser = {
        name,
        email,
        role: "student",
        status: "active",
        enrolledCourses: [],
        savedQuestions: [],
        xp: 0,
        streak: 0,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", uid), newUser);
      updateActivity();
      return { uid, ...newUser };
    } catch (err) {
      throw err;
    }
  };

  const sendPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw err;
    }
  };

  const addXP = async (amount) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const lbRef = doc(db, "leaderboard", user.uid);

      // Update both for consistency
      await Promise.all([
        updateDoc(userRef, {
          totalXP: increment(amount),
          lastActive: serverTimestamp(),
        }),
        setDoc(
          lbRef,
          {
            xp: increment(amount),
            last_updated: serverTimestamp(),
          },
          { merge: true },
        ),
      ]);
    } catch (err) {
      console.error("XP Gain Error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isInitializing,
        login,
        signUp,
        signInWithGoogle,
        sendPasswordReset,
        logout: handleLogout,
        addXP,
        mounted,
        updateActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "./config";
import { FirebaseError } from "firebase/app";
import { doc, setDoc, getDoc, Timestamp, updateDoc } from "firebase/firestore";

export interface UserProfile {
  fullname: string;
  gender: string;
  dob: string; // store as DD/MM/YYYY
  mobile: string;
  city: string;
  pincode: string;
  state: string;
  email: string;
  createdAt: Timestamp;
  emailVerified: boolean;
}

/**
 * Register a new user
 */
export const register = async (
  email: string,
  password: string,
  profile: Omit<UserProfile, "email" | "createdAt" | "emailVerified">
) => {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await sendEmailVerification(user);

    const userProfile: UserProfile = {
      ...profile,
      email,
      createdAt: Timestamp.now(),
      emailVerified: false,
    };

    await setDoc(doc(db, "users", user.uid), userProfile);

    return { user, profile: userProfile };
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      if (error.code === "auth/email-already-in-use") {
        throw new Error("This email is already registered.");
      }
      if (error.code === "auth/weak-password") {
        throw new Error("Password must be at least 6 characters.");
      }
      if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      }
      throw new Error(error.message || "Registration failed.");
    }
    throw new Error("An unexpected error occurred during registration.");
  }
};

/**
 * Login existing user
 */
export const login = async (email: string, password: string) => {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (user.emailVerified) {
      await updateDoc(doc(db, "users", user.uid), { emailVerified: true });
    }

    return user;
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email.");
      }
      if (error.code === "auth/wrong-password") {
        throw new Error("Incorrect password.");
      }
      if (error.code === "auth/too-many-requests") {
        throw new Error("Too many failed attempts. Try again later.");
      }
      throw new Error(error.message || "Login failed.");
    }
    throw new Error("An unexpected error occurred during login.");
  }
};

/**
 * Logout the current user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      throw new Error(error.message || "Logout failed.");
    }
    throw new Error("An unexpected error occurred during logout.");
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      throw new Error(error.message || "Error fetching user profile.");
    }
    throw new Error("An unexpected error occurred while fetching user profile.");
  }
};

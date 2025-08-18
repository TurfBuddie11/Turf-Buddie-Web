import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth, db } from "./config";
import { FirebaseError } from "firebase/app";
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc,
  DocumentSnapshot,
} from "firebase/firestore";
import { UserProfile } from "../types/user";

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const userCredentials = await signInWithPopup(auth, provider);
    const user = userCredentials.user;

    // Check if email is already used with another provider
    const signInMethods = await fetchSignInMethodsForEmail(
      auth,
      user.email || ""
    );
    if (signInMethods.includes("password")) {
      throw new Error(
        "This email is already registered with Email/Password. Please sign in using that method."
      );
    }

    const isNewUser =
      user.metadata.creationTime === user.metadata.lastSignInTime;

    if (isNewUser) {
      console.log("New User");
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          name: user.displayName,
          gender: null,
          dob: null,
          mobile: user.phoneNumber,
          city: null,
          pincode: null,
          state: null,
          emailVerified: true,
        },
        {
          merge: true,
        }
      );
    }

    return userCredentials;
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "auth/account-exists-with-different-credential") {
        throw new Error(
          "An account already exists with the same email address but different sign-in credentials"
        );
      }
      if (error.code === "auth/user-not-found") {
        throw new Error("User not found");
      }
      if (error.code === "auth/network-request-failed") {
        throw new Error("Network Error");
      }
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Google Sign in cancelled by user");
      }
      if (error.code === "auth/popup-blocked") {
        throw new Error("Sign In Blocked Enable JavaScript in Settings");
      }
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Google Sign in failed. Please try again");
  }
};

/**
 * Register a new user
 */
export const registerWithEmail = async (
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

export const login = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredentials = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredentials.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("User not found.");
    }

    const data = userSnap.data();

    if (user.emailVerified && !data.emailVerified) {
      await updateDoc(userRef, { emailVerified: true });
    }

    return userCredentials;
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/user-not-found":
          throw new Error("No account found with this email.");
        case "auth/wrong-password":
          throw new Error("Incorrect password.");
        case "auth/too-many-requests":
          throw new Error("Too many failed attempts. Try again later.");
        default:
          throw new Error(error.message || "Login failed.");
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    console.error("Unexpected login error:", error);
    throw new Error("Something went wrong while logging in. Please try again.");
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
): Promise<DocumentSnapshot> => {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap;
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      throw new Error(error.message || "Error fetching user profile.");
    }
    throw new Error(
      "An unexpected error occurred while fetching user profile."
    );
  }
};

export const updateUserProfile = async (
  userId: string,
  data: Omit<UserProfile, "createdAt" | "emailVerified">
) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    console.error(error);
    throw new Error("Profile Setup Failed");
  }
};

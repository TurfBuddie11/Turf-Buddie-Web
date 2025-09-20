import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc,
  DocumentSnapshot,
  writeBatch,
  collection,
} from "firebase/firestore";
import { auth, db } from "./config";
import { UserProfile } from "../types/user";
import { nanoid } from "nanoid";

// --- Private Helper Functions ---

/**
 * Creates a user profile document in Firestore if one doesn't already exist.
 * This is called after a new user signs up.
 * @param user - The Firebase Auth user object.
 * @param profileData - Partial profile data to initialize the document with.
 * @returns The user's profile data.
 */
const createUserProfile = async (
  user: User,
  profileData: Partial<UserProfile>,
): Promise<UserProfile> => {
  const userRef = doc(db, "users", user.uid);
  const profileSnap = await getDoc(userRef);

  if (!profileSnap.exists()) {
    const email = user.email ?? profileData.email;
    if (!email) {
      throw new Error("Email is required to create a user profile.");
    }

    const name = user.displayName ?? profileData.name;
    if (!name) {
      throw new Error("Name is required to create a user profile.");
    }

    // Generate a referral code for the new user
    const referralCode = nanoid(8).toUpperCase();

    // This object is now type-safe because the UserProfile interface allows optional fields.
    const newUserProfile: UserProfile = {
      ...profileData,
      uid: user.uid,
      email,
      name,
      createdAt: Timestamp.now(),
      emailVerified: user.emailVerified,
      referralCode, // Add the generated referral code
    };

    await setDoc(userRef, newUserProfile);
    await createLoyaltyAccount(user.uid);

    return newUserProfile;
  }

  return profileSnap.data() as UserProfile;
};

/**
 * Creates a loyalty account with a welcome bonus for a new user.
 * @param userId - The UID of the user.
 */
const createLoyaltyAccount = async (userId: string) => {
  const batch = writeBatch(db);
  const loyaltyPointsRef = doc(db, "loyalty_points", userId);
  const loyaltyHistoryRef = doc(collection(db, "loyalty_history"));

  batch.set(loyaltyPointsRef, { balance: 50 });
  batch.set(loyaltyHistoryRef, {
    userId,
    amount: 50,
    type: "credit",
    reason: "Welcome bonus",
    timestamp: Timestamp.now(),
  });

  await batch.commit();
};

// --- Public Auth & Profile Functions ---

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const userCredentials = await signInWithPopup(auth, googleProvider);
    const user = userCredentials.user;

    // Check if the email is already registered with a different provider (e.g., email/password)
    const signInMethods = await fetchSignInMethodsForEmail(auth, user.email!);
    if (
      signInMethods.length > 0 &&
      !signInMethods.includes(GoogleAuthProvider.PROVIDER_ID)
    ) {
      throw new Error(
        "This email is already registered. Please sign in using your original method.",
      );
    }

    await createUserProfile(user, {
      name: user.displayName ?? undefined,
      email: user.email ?? undefined,
    });
    return userCredentials;
  } catch (error) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/account-exists-with-different-credential":
          throw new Error(
            "An account with this email already exists. Please sign in with your password to link your Google account.",
          );
        case "auth/popup-closed-by-user":
          throw new Error("Google Sign-In was cancelled.");
        case "auth/network-request-failed":
          throw new Error("Network error. Please check your connection.");
        default:
          throw new Error(error.message || "Google Sign-In failed.");
      }
    }
    if (error instanceof Error) throw error;
    throw new Error("An unexpected error occurred during Google Sign-In.");
  }
};

export const registerWithEmail = async (
  email: string,
  password: string,
  profile: Omit<
    UserProfile,
    "uid" | "email" | "createdAt" | "emailVerified" | "referralCode"
  >,
) => {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await sendEmailVerification(user);

    const userProfile = await createUserProfile(user, profile);
    return { user, profile: userProfile };
  } catch (error) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/email-already-in-use":
          throw new Error("This email is already registered.");
        case "auth/weak-password":
          throw new Error("Password must be at least 6 characters.");
        case "auth/invalid-email":
          throw new Error("Invalid email address.");
        default:
          throw new Error(error.message || "Registration failed.");
      }
    }
    if (error instanceof Error) throw error;
    throw new Error("An unexpected error occurred during registration.");
  }
};

export const login = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  try {
    const userCredentials = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredentials.user;
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // This case is unlikely if auth succeeded, but it's good for data integrity.
      await createUserProfile(user, {});
    } else if (user.emailVerified && !userSnap.data()?.emailVerified) {
      await updateDoc(userRef, { emailVerified: true });
    }

    return userCredentials;
  } catch (error) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/invalid-credential":
          throw new Error("Invalid email or password.");
        case "auth/too-many-requests":
          throw new Error(
            "Access to this account has been temporarily disabled due to many failed login attempts.",
          );
        default:
          throw new Error(error.message || "Login failed.");
      }
    }
    if (error instanceof Error) throw error;
    throw new Error("An unexpected error occurred during login.");
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw new Error("An unexpected error occurred during logout.");
  }
};

export const getUserProfile = async (
  uid: string,
): Promise<DocumentSnapshot> => {
  try {
    return await getDoc(doc(db, "users", uid));
  } catch (error) {
    console.error("Get User Profile Error:", error);
    throw new Error("Error fetching user profile.");
  }
};

export const updateUserProfile = async (
  userId: string,
  data: Partial<UserProfile>,
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, data);
  } catch (error) {
    console.error("Update User Profile Error:", error);
    throw new Error("Failed to update profile.");
  }
};

export const sendResetPasswordEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Send Reset Password Email Error:", error);
    throw new Error("Failed to send password reset email.");
  }
};

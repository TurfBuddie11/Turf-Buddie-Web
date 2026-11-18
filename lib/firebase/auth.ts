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
import { OwnerProfile } from "../types/owner";
import { nanoid } from "nanoid";
import { SignupFormData } from "../types/signup.types";

/* ==============================
   INTERNAL HELPERS
============================== */

const createLoyaltyAccount = async (userId: string) => {
  const batch = writeBatch(db);

  batch.set(doc(db, "loyalty_points", userId), { balance: 25 });
  batch.set(doc(collection(db, "loyalty_history")), {
    userId,
    amount: 25,
    type: "credit",
    reason: "Welcome bonus",
    timestamp: Timestamp.now(),
  });

  await batch.commit();
};

const createUserProfile = async (
  user: User,
  profileData: Partial<UserProfile>,
): Promise<UserProfile> => {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    if (!user.email) throw new Error("Email missing");

    // Drop undefined values (Firestore rejects them). The form's
    // `referralCode` is the code the user *entered*, so store it as
    // `referredBy` instead of overwriting the user's own generated code.
    const { referralCode: enteredReferral, ...rest } = Object.fromEntries(
      Object.entries(profileData).filter(([, v]) => v !== undefined),
    ) as Partial<UserProfile>;

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName ?? profileData.name ?? "",
      createdAt: Timestamp.now(),
      emailVerified: user.emailVerified,
      ...rest,
      referralCode: nanoid(8).toUpperCase(),
      ...(enteredReferral ? { referredBy: enteredReferral } : {}),
    };

    await setDoc(ref, profile);
    try {
      await createLoyaltyAccount(user.uid);
    } catch (err) {
      // Welcome bonus is non-critical; never block signup on it.
      console.error("[signup] loyalty account creation failed:", err);
    }
    return profile;
  }

  return snap.data() as UserProfile;
};

const createOwnerProfile = async (
  user: User,
  profileData: Partial<OwnerProfile>,
): Promise<OwnerProfile> => {
  const ref = doc(db, "owners", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    if (!user.email) throw new Error("Email missing");

    const profile: OwnerProfile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName ?? profileData.name ?? "",
      createdAt: Timestamp.now(),
      emailVerified: user.emailVerified,
      ...profileData,
    };

    await setDoc(ref, profile);
    return profile;
  }

  return snap.data() as OwnerProfile;
};

/* ==============================
   GOOGLE SIGN-IN
============================== */

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;

    if (!user.email) throw new Error("Email not available");

    const methods = await fetchSignInMethodsForEmail(auth, user.email);

    if (
      methods.length > 0 &&
      !methods.includes(GoogleAuthProvider.PROVIDER_ID)
    ) {
      await signOut(auth);
      throw new FirebaseError(
        "auth/account-exists-with-different-credential",
        "Account exists with another sign-in method.",
      );
    }

    await createUserProfile(user, {});
    return cred;
  } catch (error) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/account-exists-with-different-credential":
          throw new Error(
            "This email is already registered. Please log in using your original method.",
          );
        case "auth/popup-closed-by-user":
          throw new Error("Google sign-in cancelled.");
        default:
          throw new Error(error.message);
      }
    }
    throw error;
  }
};

/* ==============================
   EMAIL / PASSWORD
============================== */

const signupErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please log in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/operation-not-allowed":
        return "Email/password signup is disabled in Firebase. Enable it in Firebase Console → Authentication → Sign-in method.";
      case "auth/invalid-api-key":
      case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        return "Firebase is not configured (invalid or missing NEXT_PUBLIC_FIREBASE_* env variables).";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a few minutes and try again.";
      case "auth/admin-restricted-operation":
        return "New sign-ups are disabled in Firebase. Enable 'Allow creation (sign-up)' in Firebase Console → Authentication → Settings → User actions.";
      case "auth/password-does-not-meet-requirements":
        return "Password doesn't meet the project's password policy (check uppercase/lowercase/number/special-character rules in Firebase Console → Authentication → Settings → Password policy).";
      case "auth/configuration-not-found":
        return "Firebase Authentication is not set up for this project. Enable it in Firebase Console → Authentication.";
      case "permission-denied":
        return "Account was created but saving your profile was blocked by Firestore rules. Please contact support.";
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : "Signup failed.";
};

export const registerWithEmail = async (
  email: string,
  password: string,
  profile: SignupFormData,
) => {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // Save the profile first so a failed verification email can never leave
    // an Auth account without a Firestore profile.
    const savedProfile =
      profile.role === "owner"
        ? await createOwnerProfile(user, profile)
        : await createUserProfile(user, profile);

    try {
      await sendEmailVerification(user);
    } catch (err) {
      // User can resend from the login page; don't fail the whole signup.
      console.error("[signup] verification email failed:", err);
    }

    return { user, profile: savedProfile };
  } catch (error) {
    console.error(
      "[signup] failed:",
      error instanceof FirebaseError ? error.code : "",
      error,
    );
    throw new Error(signupErrorMessage(error));
  }
};

export const login = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const ref = doc(db, "users", cred.user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) await createUserProfile(cred.user, {});
  if (cred.user.emailVerified && !snap.data()?.emailVerified) {
    await updateDoc(ref, { emailVerified: true });
  }

  return cred;
};

export const loginOwner = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const ref = doc(db, "owners", cred.user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) await createOwnerProfile(cred.user, {});
  if (cred.user.emailVerified && !snap.data()?.emailVerified) {
    await updateDoc(ref, { emailVerified: true });
  }

  return cred;
};

export const loginAdmin = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  // Admin access is decided server-side by the `admin` custom claim
  // (see /api/auth/admin-session), not by a client-written document.
  return signInWithEmailAndPassword(auth, email, password);
};

/* ==============================
   UTILITIES
============================== */

export const logout = async () => {
  await signOut(auth);
};

export const sendResetPasswordEmail = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const getUserProfile = async (
  uid: string,
): Promise<DocumentSnapshot> => {
  return getDoc(doc(db, "users", uid));
};

export const getOwnerProfile = async (
  uid: string,
): Promise<DocumentSnapshot> => {
  return getDoc(doc(db, "owners", uid));
};

export const updateUserProfile = async (
  uid: string,
  data: Partial<UserProfile>,
) => {
  await updateDoc(doc(db, "users", uid), data);
};

export const updateOwnerProfile = async (
  uid: string,
  data: Partial<OwnerProfile>,
) => {
  await updateDoc(doc(db, "owners", uid), data);
};

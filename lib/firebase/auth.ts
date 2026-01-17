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

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      name: user.displayName ?? profileData.name ?? "",
      createdAt: Timestamp.now(),
      emailVerified: user.emailVerified,
      referralCode: nanoid(8).toUpperCase(),
      ...profileData,
    };

    await setDoc(ref, profile);
    await createLoyaltyAccount(user.uid);
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

const createAdminProfile = async (user: User) => {
  const ref = doc(db, "admins", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      createdAt: Timestamp.now(),
      emailVerified: user.emailVerified,
    });
  }
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

export const registerWithEmail = async (
  email: string,
  password: string,
  profile: SignupFormData,
) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await sendEmailVerification(user);

  if (profile.role === "owner") {
    return createOwnerProfile(user, profile);
  }

  return createUserProfile(user, profile);
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
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await createAdminProfile(cred.user);
  return cred;
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

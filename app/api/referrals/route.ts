import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

type FirebaseError = { codePrefix: string };
const isFirebaseError = (error: unknown): error is FirebaseError => {
  return typeof error === "object" && error !== null && "codePrefix" in error;
};

export async function GET() {
  try {
    const authHeader = (await headers()).get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const referralCode = userData?.referralCode || null;

    const referralsRef = adminDb
      .collection("referrals")
      .where("referrerId", "==", uid);
    const referralsSnapshot = await referralsRef.get();

    const referralsHistoryPromises = referralsSnapshot.docs.map(async (doc) => {
      const referralData = doc.data();
      const refereeId = referralData.refereeId;

      let refereeName = "Unnamed User";
      if (refereeId) {
        const refereeDoc = await adminDb
          .collection("users")
          .doc(refereeId)
          .get();
        if (refereeDoc.exists) {
          refereeName = refereeDoc.data()?.name || "Unnamed User";
        }
      }

      return {
        ...referralData,
        refereeName,
        timestamp: referralData.timestamp?.toDate().toISOString() ?? null,
      };
    });

    const referralsHistory = await Promise.all(referralsHistoryPromises);

    return NextResponse.json({ referralCode, referralsHistory });
  } catch (error: unknown) {
    console.error("Error fetching referral data:", error);
    if (isFirebaseError(error) && error.codePrefix === "auth") {
      return NextResponse.json(
        { error: "Unauthorized: Invalid Token" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = (await headers()).get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const refereeId = decodedToken.uid;

    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 },
      );
    }

    const usersRef = adminDb.collection("users");
    const referrerSnapshot = await usersRef
      .where("referralCode", "==", referralCode.toUpperCase())
      .limit(1)
      .get();

    if (referrerSnapshot.empty) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 },
      );
    }

    const referrerDoc = referrerSnapshot.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === refereeId) {
      return NextResponse.json(
        { error: "You cannot refer yourself" },
        { status: 400 },
      );
    }

    await adminDb.runTransaction(async (transaction) => {
      const refereeRef = usersRef.doc(refereeId);
      const refereeDoc = await transaction.get(refereeRef);
      const refereeData = refereeDoc.data();

      if (refereeData?.referredBy) {
        throw new Error("You have already been referred");
      }

      transaction.update(refereeRef, { referredBy: referrerId });
      const referralRef = adminDb.collection("referrals").doc();
      transaction.set(referralRef, {
        referrerId,
        refereeId,
        code: referralCode,
        status: "completed",
        timestamp: FieldValue.serverTimestamp(),
      });

      const referrerLoyaltyRef = adminDb
        .collection("loyalty_points")
        .doc(referrerId);
      const refereeLoyaltyRef = adminDb
        .collection("loyalty_points")
        .doc(refereeId);

      transaction.set(
        referrerLoyaltyRef,
        { balance: FieldValue.increment(100) },
        { merge: true },
      );
      transaction.set(
        refereeLoyaltyRef,
        { balance: FieldValue.increment(50) },
        { merge: true },
      );

      // Create history logs for both users
      const referrerTxRef = adminDb.collection("loyalty_history").doc();
      transaction.set(referrerTxRef, {
        userId: referrerId,
        amount: 100, // Use 'amount' for consistency with loyalty system
        type: "credit",
        reason: `Referred ${refereeData?.name || "a new user"}`,
        timestamp: FieldValue.serverTimestamp(),
        context: { referralId: referralRef.id },
      });

      const refereeTxRef = adminDb.collection("loyalty_history").doc();
      transaction.set(refereeTxRef, {
        userId: refereeId,
        amount: 50, // Use 'amount' for consistency
        type: "credit",
        reason: "Used referral code",
        timestamp: FieldValue.serverTimestamp(),
        context: { referralId: referralRef.id },
      });
    });

    return NextResponse.json(
      { message: "Referral applied successfully!" },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error processing referral:", error);
    if (isFirebaseError(error) && error.codePrefix === "auth") {
      return NextResponse.json(
        { error: "Unauthorized: Invalid Token" },
        { status: 401 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

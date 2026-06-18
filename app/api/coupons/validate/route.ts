import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    // Auth check
    const authHeader = (await headers()).get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    await getAuth().verifyIdToken(idToken);

    const { code, orderAmount } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, message: "Invalid coupon code." });
    }

    const couponRef = adminDb.collection("Coupons").doc(code.trim().toUpperCase());
    const couponSnap = await couponRef.get();

    if (!couponSnap.exists) {
      return NextResponse.json({ valid: false, message: "Coupon not found." });
    }

    const coupon = couponSnap.data()!;

    if (!coupon.active) {
      return NextResponse.json({ valid: false, message: "This coupon is no longer active." });
    }

    // Expiry check
    if (coupon.expiryDate) {
      const expiry = coupon.expiryDate.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate);
      if (expiry < new Date()) {
        return NextResponse.json({ valid: false, message: "This coupon has expired." });
      }
    }

    // Max uses check
    if (coupon.maxUses && coupon.maxUses > 0 && (coupon.usedCount || 0) >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: "This coupon has reached its usage limit." });
    }

    // Minimum order check
    if (coupon.minOrderValue && orderAmount < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        message: `Minimum order amount of ₹${coupon.minOrderValue} required.`,
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === "percent") {
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === "flat") {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    }

    return NextResponse.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      message: coupon.discountType === "percent"
        ? `${coupon.discountValue}% off applied! You save ₹${discountAmount}`
        : `₹${discountAmount} off applied!`,
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return NextResponse.json({ valid: false, message: "Failed to validate coupon." }, { status: 500 });
  }
}

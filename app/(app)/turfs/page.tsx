"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TurfPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/explore");
  }, [router]);
  return null;
}

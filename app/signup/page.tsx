import React, { Suspense } from "react";
import SignUpForm from "./signup-form";

export default function page() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

export type SignupFormData = {
  name: string;
  email: string;
  role: string;
  gender?: "Male" | "Female" | "Other";
  dob?: string;
  mobile?: string;
  area?: string;
  city?: string;
  pincode?: string;
  state?: string;
  referralCode?: string;
};

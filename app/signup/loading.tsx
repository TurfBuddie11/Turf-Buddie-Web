import { Loader2 } from "lucide-react";

export default function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Loading Sign Up...</p>
    </div>
  );
}

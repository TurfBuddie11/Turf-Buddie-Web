import { Loader2 } from "lucide-react";

export default function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Loading Sign Up...</p>
    </div>
  );
}

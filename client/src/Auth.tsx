import { useState } from "react";
import Login from "./Login";
import SignUp from "./SignUp";

export default function Auth({ onSuccess }: { onSuccess: () => void }) {
  const [view, setView] = useState<"login" | "signup">("login");

  return view === "login" ? (
    <Login
      onSuccess={onSuccess}
      onSwitchToSignUp={() => setView("signup")}
    />
  ) : (
    <SignUp
      onSuccess={onSuccess}
      onSwitchToLogin={() => setView("login")}
    />
  );
}

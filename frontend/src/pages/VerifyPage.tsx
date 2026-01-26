import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyMagicLink } from "../api";
import { useAuth } from "../context/AuthContext";
import { useLog } from "../hooks/useLog";
import { extractErrorMessage } from "../services/LogService";

/**
 * VerifyPage - Legacy magic link verification
 * 
 * This page handles old-style magic link verification for backward compatibility.
 * The primary auth method is now OTP (handled in LoginPage).
 */
export function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: logError } = useLog();
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(true);
  const hasVerified = useRef(false);

  useEffect(() => {
    // Prevent double verification
    if (hasVerified.current) return;
    
    const token = params.get("token");
    if (!token) {
      setError("Invalid login link. Please request a new one.");
      setVerifying(false);
      return;
    }

    hasVerified.current = true;

    const verify = async () => {
      try {
        const { user, token: sessionToken } = await verifyMagicLink(token);
        login(sessionToken, user);
        success("auth", "Signed in successfully", `Welcome back, ${user.email}`);
        // Redirect to home
        window.location.href = "/";
      } catch (err) {
        setError("This login link is invalid or has expired. Please request a new one.");
        logError("auth", "Sign in failed", extractErrorMessage(err));
        setVerifying(false);
        hasVerified.current = false;
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-gray-600 dark:text-gray-300">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl dark:bg-red-900">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Link expired</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">{error}</p>
        </div>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

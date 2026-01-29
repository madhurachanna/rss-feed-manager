import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP, verifyOTP, fetchMe } from "../api";
import { useAuth } from "../context/AuthContext";
import { setAuthToken } from "../api/client";
import { useLog } from "../hooks/useLog";
import { extractErrorMessage } from "../services/LogService";
import { Button, Input, FormGroup } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, info, error: logError } = useLog();

  // Step: "email" or "otp"
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === "otp") {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await sendOTP(trimmed);
      setEmail(trimmed);
      setStep("otp");
      setResendCooldown(60); // 60 second cooldown
      info("auth", "Code sent", `Check your email at ${trimmed}`);
    } catch (err) {
      const message = extractErrorMessage(err);
      if (message.includes("too many")) {
        setError("Too many attempts. Please try again in 30 minutes.");
      } else {
        setError("Unable to send code. Please try again.");
      }
      logError("auth", "Failed to send code", message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setError("");
    setLoading(true);
    try {
      await sendOTP(email);
      setOtp(["", "", "", "", "", ""]);
      setResendCooldown(60);
      info("auth", "Code resent", `Check your email at ${email}`);
    } catch (err) {
      const message = extractErrorMessage(err);
      if (message.includes("too many")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Unable to resend code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    // Auto-advance to next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const code = newOtp.join("");
      if (code.length === 6) {
        handleVerifyOTP(code);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleVerifyOTP(pasted);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    setError("");
    setLoading(true);

    try {
      const { user, token } = await verifyOTP(email, code);
      login(token, user);
      success("auth", "Signed in successfully", `Welcome back, ${user.email}`);
      navigate("/", { replace: true });
    } catch (err) {
      const message = extractErrorMessage(err);
      if (message.includes("too many")) {
        setError("Too many attempts. Please request a new code.");
        setOtp(["", "", "", "", "", ""]);
      } else {
        setError("Invalid or expired code. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
      logError("auth", "Verification failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    handleVerifyOTP(code);
  };

  // Email entry step
  if (step === "email") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[var(--page-bg-start)] to-[var(--page-bg-end)] px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-[var(--surface)] p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Sign in to RSS Feed Manager</p>
          </div>

          <form onSubmit={handleSendOTP} className="space-y-4">
            <FormGroup label="Email address" error={error}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                error={!!error}
              />
            </FormGroup>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              Send sign-in code
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            We'll email you a 6-digit code for password-free sign in.
          </p>
        </div>
      </div>
    );
  }

  // OTP entry step
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[var(--page-bg-start)] to-[var(--page-bg-end)] px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-[var(--surface)] p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-3xl">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enter your code</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            We sent a 6-digit code to
          </p>
          <p className="font-medium text-gray-900 dark:text-white">{email}</p>
        </div>

        <form onSubmit={handleSubmitOTP} className="space-y-6">
          {/* OTP Input - keeping custom styling for this specific use case */}
          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="h-14 w-12 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] text-center text-2xl font-bold shadow-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 dark:text-white"
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={otp.join("").length !== 6}
            fullWidth
            size="lg"
          >
            Sign in
          </Button>
        </form>

        <div className="space-y-3 text-center">
          <Button
            variant="ghost"
            onClick={handleResendOTP}
            disabled={resendCooldown > 0 || loading}
            className="text-[var(--accent)]"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </Button>

          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setStep("email");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Code expires in 10 minutes
        </p>
      </div>
    </div>
  );
}

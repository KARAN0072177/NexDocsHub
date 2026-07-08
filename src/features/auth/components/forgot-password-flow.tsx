"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import {
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema,
  type ForgotPasswordRequestSchema,
  type ForgotPasswordVerifySchema,
  type ForgotPasswordResetSchema,
} from "../schemas/forgot-password.schema";
import { AuthShell, AuthField, authInputClass } from "./auth-shell";
import { IconMail, IconUser, IconLock, IconSpinner, IconAlert, IconCheck, IconClock } from "./auth-icons";

type FlowStep = "REQUEST" | "VERIFY" | "RESET";

export function ForgotPasswordFlow() {
  const [step, setStep] = useState<FlowStep>("REQUEST");
  const [email, setEmail] = useState("");
  const [censoredEmail, setCensoredEmail] = useState("");
  const [serverError, setServerError] = useState("");

  // Cooldown states for OTP Resend
  const [cooldown, setCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Form hooks
  const requestForm = useForm<ForgotPasswordRequestSchema>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { identifier: "" },
  });

  const verifyForm = useForm<ForgotPasswordVerifySchema>({
    resolver: zodResolver(forgotPasswordVerifySchema),
    defaultValues: { email: "", otp: "" },
  });

  // Keep email synchronized in verify form
  useEffect(() => {
    if (email) {
      verifyForm.setValue("email", email);
    }
  }, [email, verifyForm]);

  const resetForm = useForm<ForgotPasswordResetSchema>({
    resolver: zodResolver(forgotPasswordResetSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  // Keep email synchronized in reset form
  useEffect(() => {
    if (email) {
      resetForm.setValue("email", email);
    }
  }, [email, resetForm]);

  // Submission handlers
  const onRequestSubmit = async (values: ForgotPasswordRequestSchema) => {
    setServerError("");
    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        setServerError(result.error?.message ?? "Failed to request code.");
        return;
      }

      setEmail(result.data.email);
      setCensoredEmail(result.data.censoredEmail);
      setStep("VERIFY");
      setCooldown(60); // Trigger 60s resend timer
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const onVerifySubmit = async (values: ForgotPasswordVerifySchema) => {
    setServerError("");
    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        setServerError(result.error?.message ?? "Invalid verification code.");
        return;
      }

      setStep("RESET");
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const onResetSubmit = async (values: ForgotPasswordResetSchema) => {
    setServerError("");
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.error?.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(
            ([field, messages]) => {
              if (!Array.isArray(messages) || messages.length === 0) return;
              resetForm.setError(field as keyof ForgotPasswordResetSchema, {
                type: "server",
                message: messages[0],
              });
            }
          );
        }
        setServerError(result.error?.message ?? "Failed to reset password.");
        return;
      }

      // Successful password change redirect
      window.location.href = "/login?reset=true";
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0) return;
    setServerError("");
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/forgot-password/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!result.success) {
        setServerError(result.error?.message ?? "Failed to resend code.");
        return;
      }

      setResendSuccess(true);
      setCooldown(60); // Reset timer
      verifyForm.setValue("otp", ""); // Clear old input
    } catch {
      setServerError("Failed to resend OTP. Please try again.");
    }
  };

  // Render Step 1: Request Reset
  if (step === "REQUEST") {
    return (
      <AuthShell
        footer={
          <Link
            href="/login"
            className="text-xs text-neutral-400 hover:text-white transition font-medium"
          >
            Back to log in
          </Link>
        }
      >
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="text-xs text-neutral-500 font-medium font-sans">
            Enter your email or username and we will send you a code.
          </p>
        </div>

        <form
          onSubmit={requestForm.handleSubmit(onRequestSubmit)}
          className="mt-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
            >
              Email or Username
            </label>
            <AuthField icon={<IconUser className="h-[18px] w-[18px]" />}>
              <input
                id="identifier"
                type="text"
                placeholder="you@example.com"
                disabled={requestForm.formState.isSubmitting}
                {...requestForm.register("identifier")}
                className={authInputClass}
              />
            </AuthField>
            {requestForm.formState.errors.identifier && (
              <p className="text-[11px] font-semibold text-rose-450 mt-1">
                {requestForm.formState.errors.identifier.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 flex items-start gap-2.5 break-words">
              <IconAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={requestForm.formState.isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-950/40 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {requestForm.formState.isSubmitting ? (
              <>
                <IconSpinner className="h-4 w-4 text-white" />
                <span>Sending code...</span>
              </>
            ) : (
              <span>Send Code</span>
            )}
          </button>
        </form>
      </AuthShell>
    );
  }

  // Render Step 2: Verify OTP
  if (step === "VERIFY") {
    return (
      <AuthShell
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("REQUEST");
              setServerError("");
            }}
            className="text-xs text-neutral-400 hover:text-white transition font-medium"
          >
            Change email
          </button>
        }
      >
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white">Enter Security Code</h1>
          <p className="text-xs text-neutral-500 font-medium font-sans">
            We sent a verification code to <span className="font-semibold text-neutral-350">{censoredEmail}</span>.
          </p>
        </div>

        <form
          onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
          className="mt-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="otp"
              className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
            >
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              placeholder="123456"
              maxLength={6}
              disabled={verifyForm.formState.isSubmitting}
              {...verifyForm.register("otp")}
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.02] py-3 text-center text-xl font-bold tracking-widest text-white placeholder:text-white/20 outline-none transition-all hover:border-white/[0.22] focus:border-blue-500/50 focus:bg-white/[0.04] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {verifyForm.formState.errors.otp && (
              <p className="text-[11px] font-semibold text-rose-455 mt-1">
                {verifyForm.formState.errors.otp.message}
              </p>
            )}
          </div>

          {resendSuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 flex items-start gap-2.5">
              <IconCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>New code sent successfully. Check your email.</span>
            </div>
          )}

          {serverError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 flex items-start gap-2.5 break-words">
              <IconAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={verifyForm.formState.isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-950/40 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {verifyForm.formState.isSubmitting ? (
              <>
                <IconSpinner className="h-4 w-4 text-white" />
                <span>Verifying code...</span>
              </>
            ) : (
              <span>Verify Code</span>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={cooldown > 0}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition font-medium flex items-center gap-1.5"
            >
              <IconClock className="h-3.5 w-3.5" />
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  // Render Step 3: Password Update
  return (
    <AuthShell
      footer={
        <Link
          href="/login"
          className="text-xs text-neutral-400 hover:text-white transition font-medium"
        >
          Cancel
        </Link>
      }
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-white">New Password</h1>
        <p className="text-xs text-neutral-500 font-medium font-sans">
          Choose a secure password that you have not used recently.
        </p>
      </div>

      <form
        onSubmit={resetForm.handleSubmit(onResetSubmit)}
        className="mt-6 space-y-4"
      >
        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            New Password
          </label>
          <AuthField icon={<IconLock className="h-[18px] w-[18px]" />}>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={resetForm.formState.isSubmitting}
              {...resetForm.register("password")}
              className={authInputClass}
            />
          </AuthField>
          {resetForm.formState.errors.password && (
            <p className="text-[11px] font-semibold text-rose-450 mt-1">
              {resetForm.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            Confirm New Password
          </label>
          <AuthField icon={<IconLock className="h-[18px] w-[18px]" />}>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              disabled={resetForm.formState.isSubmitting}
              {...resetForm.register("confirmPassword")}
              className={authInputClass}
            />
          </AuthField>
          {resetForm.formState.errors.confirmPassword && (
            <p className="text-[11px] font-semibold text-rose-450 mt-1">
              {resetForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 flex items-start gap-2.5 break-words">
            <IconAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={resetForm.formState.isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-950/40 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {resetForm.formState.isSubmitting ? (
            <>
              <IconSpinner className="h-4 w-4 text-white" />
              <span>Resetting password...</span>
            </>
          ) : (
            <span>Reset Password</span>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

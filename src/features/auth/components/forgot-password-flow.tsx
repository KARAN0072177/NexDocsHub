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
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Enter your email or username and we will send you a code.
        </p>

        <form
          onSubmit={requestForm.handleSubmit(onRequestSubmit)}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium text-neutral-200"
            >
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              placeholder="you@example.com"
              disabled={requestForm.formState.isSubmitting}
              {...requestForm.register("identifier")}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
            {requestForm.formState.errors.identifier && (
              <p className="mt-1 text-sm text-red-500">
                {requestForm.formState.errors.identifier.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400 break-words">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={requestForm.formState.isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {requestForm.formState.isSubmitting
              ? "Sending code..."
              : "Send Code"}
          </button>

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-neutral-400 hover:text-white transition"
            >
              Back to log in
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // Render Step 2: Verify OTP
  if (step === "VERIFY") {
    return (
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Enter Security Code</h1>
        <p className="mt-2 text-sm text-neutral-400">
          We sent a verification code to <span className="font-semibold text-white">{censoredEmail}</span>.
        </p>

        <form
          onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-medium text-neutral-200"
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
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-center text-xl font-bold tracking-widest text-white outline-none transition focus:border-blue-500"
            />
            {verifyForm.formState.errors.otp && (
              <p className="mt-1 text-sm text-red-500">
                {verifyForm.formState.errors.otp.message}
              </p>
            )}
          </div>

          {resendSuccess && (
            <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-400">
              New code sent successfully. Check your email.
            </div>
          )}

          {serverError && (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400 break-words">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={verifyForm.formState.isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifyForm.formState.isSubmitting
              ? "Verifying code..."
              : "Verify Code"}
          </button>

          <div className="mt-4 text-center flex items-center justify-between">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={cooldown > 0}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("REQUEST");
                setServerError("");
              }}
              className="text-sm text-neutral-400 hover:text-white transition"
            >
              Change email
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Render Step 3: Password Update
  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
      <h1 className="text-3xl font-bold text-white">New Password</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Choose a secure password that you have not used recently.
      </p>

      <form
        onSubmit={resetForm.handleSubmit(onResetSubmit)}
        className="mt-8 space-y-5"
      >
        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-neutral-200"
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            disabled={resetForm.formState.isSubmitting}
            {...resetForm.register("password")}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
          {resetForm.formState.errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {resetForm.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-neutral-200"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            disabled={resetForm.formState.isSubmitting}
            {...resetForm.register("confirmPassword")}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
          {resetForm.formState.errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">
              {resetForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400 break-words">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={resetForm.formState.isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resetForm.formState.isSubmitting
            ? "Resetting password..."
            : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

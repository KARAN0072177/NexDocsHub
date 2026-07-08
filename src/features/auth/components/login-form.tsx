"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  loginSchema,
  type LoginSchema,
} from "@/features/auth/schemas/login.schema";
import { AuthShell, AuthField, authInputClass } from "./auth-shell";
import { IconMail, IconLock, IconSpinner, IconAlert, IconCheck } from "./auth-icons";

function AuthBanners() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");
  const reset = searchParams.get("reset");

  if (reset === "true") {
    return (
      <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 flex items-start gap-2.5">
        <IconCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Password reset successfully. You can now log in with your new password.</span>
      </div>
    );
  }

  if (verified === "true") {
    return (
      <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400 flex items-start gap-2.5">
        <IconCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Email verified successfully! You can now log in.</span>
      </div>
    );
  }

  if (error) {
    const errorMessages: Record<string, string> = {
      invalid_token: "The verification link is invalid.",
      expired_token:
        "The verification link has expired. Please register again.",
      verification_failed: "Email verification failed.",
      server_error: "Something went wrong. Please try again.",
    };

    return (
      <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-400 flex items-start gap-2.5">
        <IconAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{errorMessages[error] ?? "An error occurred. Please try again."}</span>
      </div>
    );
  }

  return null;
}

export function LoginForm() {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginSchema) => {
    setServerError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.error?.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(
            ([field, messages]) => {
              if (!Array.isArray(messages) || messages.length === 0) return;

              setError(field as keyof LoginSchema, {
                type: "server",
                message: messages[0],
              });
            }
          );
        }

        setServerError(
          result.error?.message ?? "Invalid email or password."
        );
        return;
      }

      // Hard redirect to homepage to reload Layout and cookies
      window.location.href = "/";
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <AuthShell
      footer={
        <Link
          href="/register"
          className="text-xs text-neutral-400 hover:text-white transition font-medium"
        >
          Don&apos;t have an account? Sign up
        </Link>
      }
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="text-xs text-neutral-500 font-medium font-sans">
          Enter your credentials to access your NexDocsHub space.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
      >
        <AuthBanners />

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            Email Address
          </label>
          <AuthField icon={<IconMail className="h-[18px] w-[18px]" />}>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              {...register("email")}
              className={authInputClass}
            />
          </AuthField>
          {errors.email && (
            <p className="text-[11px] font-semibold text-rose-450 mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-neutral-500 hover:text-white transition font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <AuthField icon={<IconLock className="h-[18px] w-[18px]" />}>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register("password")}
              className={authInputClass}
            />
          </AuthField>
          {errors.password && (
            <p className="text-[11px] font-semibold text-rose-455 mt-1">
              {errors.password.message}
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
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-950/40 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <IconSpinner className="h-4 w-4 text-white" />
              <span>Logging in...</span>
            </>
          ) : (
            <span>Log in</span>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
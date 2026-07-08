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

function AuthBanners() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");
  const reset = searchParams.get("reset");

  if (reset === "true") {
    return (
      <div className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-400">
        Password reset successfully. You can now log in with your new password.
      </div>
    );
  }

  if (verified === "true") {
    return (
      <div className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-400">
        Email verified successfully! You can now log in.
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
      <div className="mb-6 rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-400">
        {errorMessages[error] ?? "An error occurred. Please try again."}
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
    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
      <h1 className="text-3xl font-bold text-white">Log in</h1>

      <p className="mt-2 text-sm text-neutral-400">
        Welcome back to NexDocsHub.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
      >
        <AuthBanners />

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-neutral-200"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isSubmitting}
            {...register("email")}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-neutral-200"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isSubmitting}
            {...register("password")}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />

          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
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
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>

        <div className="mt-4 text-center">
          <Link
            href="/register"
            className="text-sm text-neutral-400 hover:text-white transition"
          >
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
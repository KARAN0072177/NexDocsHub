"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import {
  registerSchema,
  type RegisterSchema,
} from "@/features/auth/schemas";
import { RegisterSuccess } from "./register-success";
import { AuthShell, AuthField, authInputClass } from "./auth-shell";
import { IconMail, IconUser, IconLock, IconSpinner, IconAlert } from "./auth-icons";

export function RegisterForm() {
  const [serverError, setServerError] = useState("");
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterSchema) => {
    setServerError("");

    try {
      const response = await fetch("/api/auth/register", {
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

              setError(field as keyof RegisterSchema, {
                type: "server",
                message: messages[0],
              });
            }
          );
        }

        setServerError(result.error.message);
        return;
      }

      setSuccessEmail(result.data.email);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  if (successEmail) {
    return <RegisterSuccess email={successEmail} />;
  }

  return (
    <AuthShell
      footer={
        <Link
          href="/login"
          className="text-xs text-neutral-400 hover:text-white transition font-medium"
        >
          Already have an account? Log in
        </Link>
      }
    >
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-white">Create an account</h1>
        <p className="text-xs text-neutral-500 font-medium font-sans">
          Sign up to begin keeping your knowledge operating system preserved.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
      >
        {/* Username */}
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            Username
          </label>
          <AuthField icon={<IconUser className="h-[18px] w-[18px]" />}>
            <input
              id="username"
              type="text"
              placeholder="karan"
              autoComplete="username"
              disabled={isSubmitting}
              {...register("username")}
              className={authInputClass}
            />
          </AuthField>
          {errors.username && (
            <p className="text-[11px] font-semibold text-rose-450 mt-1">
              {errors.username.message}
            </p>
          )}
        </div>

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
          <label
            htmlFor="password"
            className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            Password
          </label>
          <AuthField icon={<IconLock className="h-[18px] w-[18px]" />}>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register("password")}
              className={authInputClass}
            />
          </AuthField>
          {errors.password && (
            <p className="text-[11px] font-semibold text-rose-450 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            Confirm Password
          </label>
          <AuthField icon={<IconLock className="h-[18px] w-[18px]" />}>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register("confirmPassword")}
              className={authInputClass}
            />
          </AuthField>
          {errors.confirmPassword && (
            <p className="text-[11px] font-semibold text-rose-450 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 flex items-start gap-2.5">
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
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
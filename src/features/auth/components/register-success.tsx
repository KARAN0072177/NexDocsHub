"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { IconMailCheck, IconClock, IconCheck } from "./auth-icons";

interface RegisterSuccessProps {
  email: string;
}

export function RegisterSuccess({ email }: RegisterSuccessProps) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/auth/verify-email/status?email=${encodeURIComponent(email)}`
        );
        const data = await response.json();
        if (active && data.success && data.verified) {
          setVerified(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error checking verification status:", err);
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [email]);

  if (verified) {
    return (
      <AuthShell
        footer={
          <Link
            href="/login"
            className="text-xs text-neutral-400 hover:text-white transition font-medium"
          >
            Go to login
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center">
          {/* Success Check Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-5 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] animate-pulse">
            <IconCheck className="h-6 w-6" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white font-display">Email verified!</h1>
          
          <p className="mt-3 text-xs text-neutral-500 leading-relaxed max-w-xs font-sans">
            Your email has been verified successfully. You can now safely close this tab or proceed to login.
          </p>

          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-blue-950/40 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 mt-6 cursor-pointer"
          >
            Go to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <Link
          href="/login"
          className="text-xs text-neutral-400 hover:text-white transition font-medium"
        >
          Back to login
        </Link>
      }
    >
      <div className="flex flex-col items-center text-center">
        {/* Verification Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400 mb-5 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]">
          <IconMailCheck className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white font-display">Verify your email</h1>
        
        <p className="mt-3 text-xs text-neutral-500 leading-relaxed max-w-xs font-sans">
          We&rsquo;ve sent a verification link to your email address:
        </p>

        <p className="mt-2 text-xs font-semibold text-neutral-200 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 break-all max-w-full font-mono select-all">
          {email}
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-[11px] text-neutral-550 max-w-xs font-medium font-sans">
          <IconClock className="h-4 w-4 text-neutral-600 shrink-0" />
          <span>The verification link expires in <strong className="text-neutral-400 font-semibold">10 minutes</strong>.</span>
        </div>

        <p className="mt-5 text-[11px] text-neutral-600 leading-relaxed font-sans">
          You can close this tab after verifying your email address.
        </p>
      </div>
    </AuthShell>
  );
}
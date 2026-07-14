import type { ReactNode } from "react";
import dynamic from "next/dynamic";

const ParticlesBackground = dynamic(
  () => import("./particles-background"),
  { ssr: false }
);

/**
 * Shared shell for all auth screens: ambient grid + glow background,
 * wordmark, and the glass card wrapper. Keeps LoginForm / RegisterForm /
 * RegisterSuccess visually identical without repeating the background
 * markup in each one.
 */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05060a] px-4 py-12">
      {/* Ambient background: fine grid + violet/cyan glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#6C5CE7]/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-160px] right-[-80px] h-[420px] w-[420px] rounded-full bg-[#22D3EE]/10 blur-[120px]" />

      {/* tsParticles dynamic ambient layout background */}
      <ParticlesBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-7 flex items-center justify-center gap-2.5 animate-fade-in">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#22D3EE] shadow-[0_0_20px_-4px_rgba(108,92,231,0.6)]">
            <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] text-white" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h9L19 8.5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 4.5V9h4.5M8.5 12.5h7M8.5 15.5h5" />
            </svg>
          </div>
          <span
            className="text-[15px] font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', ui-sans-serif)" }}
          >
            NexDocsHub
          </span>
        </div>

        {/* Glass card */}
        <div className="relative rounded-2xl border border-white/[0.12] bg-white/[0.035] p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {children}
        </div>

        {footer && <p className="mt-6 text-center text-xs text-white/25">{footer}</p>}
      </div>
    </div>
  );
}

/** Small reusable icon-input wrapper so every field looks identical. */
export function AuthField({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/30">
        {icon}
      </span>
      {children}
    </div>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-white/[0.12] bg-white/[0.02] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-white/25 outline-none transition-all hover:border-white/[0.22] focus:border-blue-500/50 focus:bg-white/[0.04] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50";

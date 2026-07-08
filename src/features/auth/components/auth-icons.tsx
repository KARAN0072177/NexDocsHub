import type { ReactNode } from "react";

export function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 12 13l9-5.5M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V7a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}

export function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <circle cx="12" cy="8.25" r="3.25" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19.5c0-3.31 3.13-6 7-6s7 2.69 7 6" />
    </svg>
  );
}

export function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V7.75a4.5 4.5 0 0 1 9 0v2.75" />
    </svg>
  );
}

export function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 5.7c.45-.1.92-.15 1.4-.15 6 0 9.5 6.45 9.5 6.45a15.6 15.6 0 0 1-3.14 3.9M6.5 6.9C4 8.6 2.5 11.5 2.5 12s3.5 6.45 9.5 6.45c1.2 0 2.3-.25 3.3-.68M9.9 10a2.75 2.75 0 0 0 3.9 3.9" />
    </svg>
  );
}

export function IconSpinner(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${props.className ?? ""}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function IconAlert(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5M12 17h.01M10.3 4.2 2.9 17.5A1.8 1.8 0 0 0 4.5 20.2h15a1.8 1.8 0 0 0 1.6-2.7L13.7 4.2a1.8 1.8 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function IconMailCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7.5 12 13l4.3-2.63M4.5 5.5h11.75M4.5 5.5A1.5 1.5 0 0 0 3 7v10a1.5 1.5 0 0 0 1.5 1.5h9" />
      <circle cx="18.5" cy="16.5" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.8 16.5 1.2 1.2 2.2-2.4" />
    </svg>
  );
}

export function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

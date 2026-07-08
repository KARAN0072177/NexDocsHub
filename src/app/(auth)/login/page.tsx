import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 ">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl text-center">
            <p className="text-neutral-400">Loading form...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
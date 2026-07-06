interface RegisterSuccessProps {
  email: string;
}

export function RegisterSuccess({
  email,
}: RegisterSuccessProps) {
  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-bold">
        Verify your email
      </h1>

      <p className="mt-4 text-muted-foreground">
        We&rsquo;ve sent a verification link to
      </p>

      <p className="mt-2 font-semibold break-all">
        {email}
      </p>

      <p className="mt-6 text-sm text-muted-foreground">
        The verification link expires in
        <span className="font-medium"> 10 minutes</span>.
      </p>

      <p className="mt-2 text-sm text-muted-foreground">
        You can close this page after verifying your email.
      </p>
    </div>
  );
}
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 lg:px-8 lg:py-8">
      <AuthForm mode="signup" />
    </main>
  );
}


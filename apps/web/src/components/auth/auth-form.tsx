"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Sparkles, User2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";

type AuthMode = "login" | "signup";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "sharklasers.com",
  "getnada.com",
  "trashmail.com",
  "dispostable.com"
]);

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateSignupForm() {
    if (!form.username.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      return "All signup fields are required.";
    }

    const email = form.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Enter a valid email address.";
    }

    const domain = email.split("@")[1] ?? "";
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return "Temporary email addresses are not allowed.";
    }

    if (form.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (form.password !== form.confirmPassword) {
      return "Password and confirm password do not match.";
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const validationError = validateSignupForm();
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }
      }

      const response =
        mode === "signup"
          ? await api.signup({
              username: form.username.trim(),
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim().toLowerCase(),
              password: form.password
            })
          : await api.login({ email: form.email.trim().toLowerCase(), password: form.password });

      setSession(response.token, response.user);
      router.replace("/chat");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[920px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#111113]/88 shadow-panel backdrop-blur-xl">
      <div className="grid lg:grid-cols-[0.9fr_0.86fr]">
        <section className="relative overflow-hidden border-b border-white/8 p-5 lg:border-b-0 lg:border-r lg:p-7 xl:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,94,0,0.18),transparent_24%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.06),transparent_18%)]" />
          <div className="relative mx-auto max-w-[400px]">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#FF5E00]/20 bg-[#FF5E00]/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffb082]">
              <Sparkles className="h-4 w-4" />
              Yazko V1
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-3">
              <div className="relative flex h-16 items-center justify-center overflow-hidden rounded-[1.05rem] border border-white/8 bg-black/40 px-4">
                <Image alt="Yazko logo" className="h-full w-auto rounded-[0.9rem] object-contain" height={64} priority src="/logo.png" width={220} />
              </div>
            </div>

            <h1 className="mt-5 max-w-md text-[2.8rem] font-semibold leading-[0.98] text-white sm:text-[3.15rem] xl:text-[3.65rem]">
              Join Yazko.
            </h1>
            <p className="auth-tagline mt-4 max-w-md text-[1.35rem] font-semibold leading-[1.1] sm:text-[1.65rem]">
              <span>Chats, but</span>{" "}
              <span className="auth-tagline-accent">actually fun.</span>{" "}
              <span className="auth-tagline-mark">✦</span>
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["☁️", "Cloud chats"],
                ["📞", "Calls built in"],
                ["⚡", "Fast replies"]
              ].map(([icon, label]) => (
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-4" key={label}>
                  <p className="text-xl">{icon}</p>
                  <p className="mt-2 text-sm font-medium text-zinc-100">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-5 lg:p-7 xl:p-8">
          <div className="mx-auto max-w-[390px]">
            <div className="grid grid-cols-2 gap-2 rounded-[1.2rem] border border-white/8 bg-black/25 p-1.5">
              <Link
                className={[
                  "rounded-[0.95rem] px-4 py-2.5 text-center text-sm font-semibold transition",
                  mode === "login" ? "bg-[#FF5E00] text-white" : "text-zinc-400 hover:text-white"
                ].join(" ")}
                href="/login"
              >
                Login
              </Link>
              <Link
                className={[
                  "rounded-[0.95rem] px-4 py-2.5 text-center text-sm font-semibold transition",
                  mode === "signup" ? "bg-[#FF5E00] text-white" : "text-zinc-400 hover:text-white"
                ].join(" ")}
                href="/signup"
              >
                Sign up
              </Link>
            </div>

            <p className="mt-5 text-[11px] uppercase tracking-[0.32em] text-[#ff9b61]">{mode === "signup" ? "Create account" : "Welcome back"}</p>
            <h2 className="mt-3 text-[2.05rem] font-semibold leading-tight text-white sm:text-[2.4rem]">
              {mode === "signup" ? "Join Yazko." : "Back on Yazko."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{mode === "signup" ? "Create your account and start chatting in real time." : "Sign in to your workspace and pick up the conversation."}</p>

            <form className="mt-6 space-y-3.5" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <>
                  <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                    <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      <User2 className="h-4 w-4" />
                      Username
                    </div>
                    <Input className="border-0 bg-transparent" placeholder="Choose a username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                      <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                        <User2 className="h-4 w-4" />
                        First name
                      </div>
                      <Input className="border-0 bg-transparent" placeholder="First name" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
                    </div>

                    <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                      <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                        <User2 className="h-4 w-4" />
                        Last name
                      </div>
                      <Input className="border-0 bg-transparent" placeholder="Last name" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} />
                    </div>
                  </div>
                </>
              ) : null}

              <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <Input className="border-0 bg-transparent" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>

              <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  <Lock className="h-4 w-4" />
                  Password
                </div>
                <Input className="border-0 bg-transparent" type="password" placeholder="Enter your password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              </div>

              {mode === "signup" ? (
                <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                  <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    <Lock className="h-4 w-4" />
                    Confirm password
                  </div>
                  <Input className="border-0 bg-transparent" type="password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
                </div>
              ) : null}

              {error ? <p className="rounded-[1rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

              <Button className="w-full justify-center py-2.5 text-base" disabled={loading} type="submit">
                {loading ? "Loading..." : mode === "signup" ? "Create account" : "Login"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-3.5 text-sm text-zinc-400">
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <Link className="font-semibold text-[#ff9b61]" href={mode === "signup" ? "/login" : "/signup"}>
                {mode === "signup" ? "Login" : "Sign up"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
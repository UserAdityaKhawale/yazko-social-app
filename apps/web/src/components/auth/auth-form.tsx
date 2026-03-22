"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, Sparkles, User2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response =
        mode === "signup"
          ? await api.signup(form)
          : await api.login({ email: form.email, password: form.password });

      setSession(response.token, response.user);
      router.replace("/chat");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[980px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#111113]/85 shadow-panel backdrop-blur-xl">
      <div className="grid lg:grid-cols-[0.95fr_0.85fr]">
        <section className="relative overflow-hidden border-b border-white/8 p-6 lg:border-b-0 lg:border-r lg:p-8 xl:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,94,0,0.18),transparent_24%),radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.06),transparent_18%)]" />
          <div className="relative mx-auto max-w-[430px]">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#FF5E00]/20 bg-[#FF5E00]/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#ffb082]">
              <Sparkles className="h-4 w-4" />
              Yazko V1
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-white/8 bg-white/[0.04] p-4">
              <div className="flex h-20 items-center justify-center rounded-[1.2rem] border border-white/8 bg-black/25 text-sm text-zinc-500">
                Logo goes here
              </div>
            </div>

            <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight text-white sm:text-4xl xl:text-[3.2rem]">
              Chat that feels warm, sharp, and easy to live in.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-300 sm:text-base">
              Electric-orange accents, social-first energy, and a focused product shell built for a polished local demo before deployment.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Cloud feel", "Soft conversation surfaces"],
                ["Voice-ready", "Calls tab and chat entry"],
                ["Lean MVP", "Only high-value features"]
              ].map(([title, body]) => (
                <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-3" key={title}>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-xs leading-6 text-zinc-400 sm:text-sm">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-6 lg:p-8 xl:p-10">
          <div className="mx-auto max-w-md">
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

            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-[#ff9b61]">{mode === "signup" ? "Create account" : "Welcome back"}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              {mode === "signup" ? "Start your first thread." : "Jump back into Yazko."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {mode === "signup"
                ? "Create your local-first account and move straight into the V1 experience."
                : "Sign in to preview the new shell, conversation rail, and cloud-style chat polish live."}
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                  <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    <User2 className="h-4 w-4" />
                    Username
                  </div>
                  <Input
                    className="border-0 bg-transparent"
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  />
                </div>
              ) : null}

              <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <Input
                  className="border-0 bg-transparent"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>

              <div className="rounded-[1.25rem] border border-white/8 bg-black/25 p-2">
                <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  <Lock className="h-4 w-4" />
                  Password
                </div>
                <Input
                  className="border-0 bg-transparent"
                  type="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>

              {error ? <p className="rounded-[1rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

              <Button className="w-full justify-center py-3 text-base" disabled={loading} type="submit">
                {loading ? "Loading..." : mode === "signup" ? "Create account" : "Login"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-zinc-400">
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

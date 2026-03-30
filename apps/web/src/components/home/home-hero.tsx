"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, PhoneCall, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeHero() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,94,0,0.16),transparent_24%),#050505] px-4 py-8 text-white lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#FF5E00]/20 bg-[#FF5E00]/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-[#ffb082]">
              <Sparkles className="h-4 w-4" />
              Real-time Messaging
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-white lg:text-6xl">
              Personal chat with a sharper, startup-grade edge.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
              Yazko gives users fast 1:1 and group conversations, reactions, replies, media, and a polished social-first interface backed by real auth and a live API.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button className="px-6 py-3 text-base" type="button">
                  Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="px-6 py-3 text-base" type="button" variant="ghost">
                  Create account
                </Button>
              </Link>
            </div>
          </section>

          <section className="grid gap-4">
            {[
              {
                icon: MessageCircle,
                title: "Chats",
                body: "Private and group chat flows built around messaging, replies, reactions, edits, deletes, and live updates."
              },
              {
                icon: PhoneCall,
                title: "Calls UI",
                body: "Voice and video surfaces are ready in the interface so the product feels like a complete communication suite."
              },
              {
                icon: ShieldCheck,
                title: "Account Ready",
                body: "Users can sign up, log in, manage profiles, and move through the product like a real SaaS app."
              }
            ].map(({ icon: Icon, title, body }) => (
              <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6" key={title}>
                <Icon className="h-5 w-5 text-[#ff9b61]" />
                <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
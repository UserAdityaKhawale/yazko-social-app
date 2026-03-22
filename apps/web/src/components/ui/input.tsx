import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[1.15rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#FF5E00]/45 focus:bg-white/[0.05]",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-[1.15rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#FF5E00]/45 focus:bg-white/[0.05]",
        props.className
      )}
    />
  );
}

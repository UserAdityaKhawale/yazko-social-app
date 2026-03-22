import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-[1.15rem] px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-[rgba(255,94,0,0.28)] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" &&
          "bg-[#FF5E00] text-white shadow-glow hover:-translate-y-0.5 hover:bg-[#ff7a29]",
        variant === "ghost" &&
          "border border-white/10 bg-white/[0.03] text-zinc-100 hover:border-[#FF5E00]/30 hover:bg-white/[0.06]",
        variant === "soft" &&
          "bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1]",
        className
      )}
      {...props}
    />
  );
}

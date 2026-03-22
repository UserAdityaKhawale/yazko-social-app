import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | undefined | null>) {
  return clsx(inputs);
}

export function formatRelative(dateString?: string) {
  if (!dateString) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(dateString));
}


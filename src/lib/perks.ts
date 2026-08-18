import type { Perk, PerkKind, PerkStatus } from "./types";
import { toCentralYmd } from "./utils";

export function perkStatusLabel(s: PerkStatus): string {
  if (s === "available") return "In The Bank";
  if (s === "pending") return "Cash-In Pending";
  if (s === "redeemed") return "Cashed In";
  if (s === "revoked") return "Revoked";
  if (s === "burned") return "Burned For FA";
  return s;
}

export function perkKindLabel(k: PerkKind): string {
  if (k === "jail_pass") return "Jail Pass";
  if (k === "pass") return "Pass";
  if (k === "date") return "Date";
  return "Favor";
}

export function isPerkExpired(p: Pick<Perk, "status" | "expiresOn">): boolean {
  if (p.status !== "available" && p.status !== "pending") return false;
  if (!p.expiresOn) return false;
  return p.expiresOn < toCentralYmd(new Date());
}

export function isPerkSpendable(p: Perk): boolean {
  return p.status === "available" && !isPerkExpired(p);
}

export function perkBadgeVariant(p: Perk) {
  if (isPerkExpired(p)) return "muted" as const;
  if (p.status === "redeemed") return "success" as const;
  if (p.status === "pending") return "warn" as const;
  if (p.status === "revoked") return "muted" as const;
  if (p.status === "burned") return "danger" as const;
  if (p.kind === "jail_pass") return "danger" as const;
  return "default" as const;
}

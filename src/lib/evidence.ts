import type { EvidenceItem, EvidenceType } from "./types";
import { uid } from "./utils";

const MAX_BYTES = 450_000; // ~base64 payload soft cap

export async function fileToEvidence(file: File): Promise<EvidenceItem> {
  if (file.size > MAX_BYTES) {
    throw new Error("File too large — keep evidence under ~350KB.");
  }
  const data = await readAsDataUrl(file);
  let type: EvidenceType = "text";
  if (file.type.startsWith("image/")) type = "image";
  else if (file.type.startsWith("audio/")) type = "audio";
  else type = "text";
  return {
    id: uid(),
    type,
    name: file.name || "attachment",
    data,
  };
}

export function textToEvidence(text: string, name = "receipt.txt"): EvidenceItem {
  return {
    id: uid(),
    type: "text",
    name,
    data: text.slice(0, 50_000),
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(`fafo-pin:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

import { useRef, useState } from "react";
import { ImagePlus, Mic, Paperclip, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { fileToEvidence, textToEvidence } from "@/lib/evidence";
import type { EvidenceItem } from "@/lib/types";

export function EvidencePicker({
  value,
  onChange,
  max = 3,
}: {
  value: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  async function addFiles(files: FileList | null, forceAudio = false) {
    if (!files?.length) return;
    const next = [...value];
    for (const file of Array.from(files)) {
      if (next.length >= max) {
        toast.error(`Max ${max} attachments.`);
        break;
      }
      try {
        const item = await fileToEvidence(file);
        if (forceAudio) item.type = "audio";
        next.push(item);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not attach file");
      }
    }
    onChange(next);
  }

  function addPaste() {
    if (!paste.trim()) return;
    if (value.length >= max) {
      toast.error(`Max ${max} attachments.`);
      return;
    }
    onChange([...value, textToEvidence(paste.trim())]);
    setPaste("");
    setShowPaste(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-3.5" />
          Photo / screenshot
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => audioRef.current?.click()}>
          <Mic className="size-3.5" />
          Voice note
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowPaste((v) => !v)}>
          <Type className="size-3.5" />
          Paste text
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.txt,.pdf"
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          capture
          className="hidden"
          onChange={(e) => void addFiles(e.target.files, true)}
        />
      </div>

      {showPaste ? (
        <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
          <Textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste a text thread, screenshots transcription, etc."
            className="min-h-20"
          />
          <Button type="button" size="sm" onClick={addPaste}>
            <Paperclip className="size-3.5" />
            Attach text
          </Button>
        </div>
      ) : null}

      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-bg-elevated p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-fg-muted uppercase">{item.type}</p>
                <p className="truncate text-sm text-fg">{item.name}</p>
                {item.type === "image" && item.data.startsWith("data:") ? (
                  <img
                    src={item.data}
                    alt={item.name}
                    className="mt-2 max-h-32 rounded-md border border-border object-contain"
                  />
                ) : null}
                {item.type === "audio" && item.data.startsWith("data:") ? (
                  <audio controls src={item.data} className="mt-2 w-full max-w-sm" />
                ) : null}
                {item.type === "text" ? (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-fg-muted">
                    {item.data.slice(0, 280)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((x) => x.id !== item.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">Evidence</p>
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-bg-subtle p-2 text-sm">
          <p className="text-xs text-fg-muted">
            {item.type} · {item.name}
          </p>
          {item.type === "image" && item.data.startsWith("data:") ? (
            <img
              src={item.data}
              alt={item.name}
              className="mt-2 max-h-48 rounded-md border border-border object-contain"
            />
          ) : null}
          {item.type === "audio" && item.data.startsWith("data:") ? (
            <audio controls src={item.data} className="mt-2 w-full" />
          ) : null}
          {item.type === "text" ? (
            <p className="mt-1 whitespace-pre-wrap text-fg-muted">{item.data}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

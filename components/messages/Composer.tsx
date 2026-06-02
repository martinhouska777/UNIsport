"use client";

import { useState } from "react";
import { IconSend } from "@/components/icons";

/*
  Message input + send button, shared by DM and channel threads. Sends on Enter
  or the send button; disables while a send is in flight. 16px text avoids the
  mobile auto-zoom. Colors are theme tokens only.
*/
export default function Composer({
  placeholder,
  onSend,
}: {
  placeholder: string;
  onSend: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await onSend(t);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 border-t border-border bg-surface px-3.5 py-2.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label="Message"
        className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim() || sending}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast transition-opacity disabled:opacity-40"
      >
        <IconSend size={18} />
      </button>
    </div>
  );
}

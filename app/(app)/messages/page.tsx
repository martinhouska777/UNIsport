"use client";

/*
  MESSAGES TAB. Two surfaces — Direct (1:1) conversations and Community channels
  — both backed by Supabase (db/messages.sql), so everything is stored forever.

  The list and the open thread live in this one page (toggled by local state),
  so the bottom nav stays put. Opening a thread directly is supported via
  ?dm=<conversationId>&name=<name> — the "Message" button on someone's profile
  links here.
*/
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppState";
import MessagesList from "@/components/messages/MessagesList";
import DmThread from "@/components/messages/DmThread";
import ChannelThread from "@/components/messages/ChannelThread";
import type { Channel, DmConversation } from "@/lib/supabase/messages";

type Open =
  | { type: "dm"; id: string; name: string }
  | { type: "channel"; id: string; name: string; icon: string; joined: boolean }
  | null;

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="px-6 py-20 text-center text-sm text-muted">Loading…</div>}>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const { userId } = useAppState();
  const router = useRouter();
  const search = useSearchParams();
  // Deep link from a profile's "Message" button: ?dm=<id>&name=<name>.
  // Read once on mount so navigating back doesn't reopen the thread.
  const [open, setOpen] = useState<Open>(() => {
    const dm = search.get("dm");
    return dm ? { type: "dm", id: dm, name: search.get("name") ?? "Member" } : null;
  });

  const back = () => {
    setOpen(null);
    // Clear any deep-link params so a refresh doesn't reopen the thread.
    if (search.get("dm")) router.replace("/messages");
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-screen-sm flex-1 flex-col">
      {open?.type === "dm" ? (
        <DmThread
          conversationId={open.id}
          title={open.name}
          currentUserId={userId}
          onBack={back}
        />
      ) : open?.type === "channel" ? (
        <ChannelThread
          channelId={open.id}
          title={open.name}
          icon={open.icon}
          joined={open.joined}
          onBack={back}
        />
      ) : (
        <MessagesList
          onOpenDm={(c: DmConversation) =>
            setOpen({ type: "dm", id: c.conversationId, name: c.otherName })
          }
          onOpenChannel={(c: Channel) =>
            setOpen({
              type: "channel",
              id: c.channelId,
              name: c.name,
              icon: c.icon,
              joined: c.joined,
            })
          }
        />
      )}
    </div>
  );
}

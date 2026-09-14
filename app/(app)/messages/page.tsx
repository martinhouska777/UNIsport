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
import MessagesList, { type MessagesTab } from "@/components/messages/MessagesList";
import DmThread from "@/components/messages/DmThread";
import ChannelThread from "@/components/messages/ChannelThread";
import NewChannel from "@/components/messages/NewChannel";
import { startDirectConversation, type Channel, type DmConversation } from "@/lib/supabase/messages";

type Open =
  | { type: "dm"; id: string; name: string; otherId: string | null }
  | { type: "channel"; id: string; name: string; icon: string; joined: boolean; isPrivate: boolean }
  | { type: "newChannel" }
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
    return dm
      ? {
          type: "dm",
          id: dm,
          name: search.get("name") ?? "Member",
          otherId: search.get("uid"),
        }
      : null;
  });

  // Which list you were on. It lives here, not in the list (which is rebuilt
  // every time a chat closes), so leaving a channel — or just coming back out
  // of one — lands on Community rather than Direct (owner, 2026-09-14).
  const [tab, setTab] = useState<MessagesTab>("direct");

  const back = () => {
    setOpen(null);
    // Clear any deep-link params so a refresh doesn't reopen the thread.
    if (search.get("dm")) router.replace("/messages");
  };

  // "Message" on someone in Channel info: straight into your chat with them.
  const openDmWith = async (person: { id: string; name: string }) => {
    try {
      const conversationId = await startDirectConversation(person.id);
      setOpen({ type: "dm", id: conversationId, name: person.name, otherId: person.id });
      setTab("direct"); // that chat lives under Direct, so back from it lands there
    } catch {
      // The chat couldn't be started — stay on Channel info.
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-screen-sm flex-1 flex-col">
      {open?.type === "dm" ? (
        <DmThread
          conversationId={open.id}
          title={open.name}
          otherId={open.otherId}
          currentUserId={userId}
          onBack={back}
        />
      ) : open?.type === "newChannel" ? (
        <NewChannel
          onBack={back}
          // Straight into the channel you just started — you're its first member.
          onCreated={(c) =>
            setOpen({
              type: "channel",
              id: c.channelId,
              name: c.name,
              icon: "message",
              joined: true,
              isPrivate: c.isPrivate,
            })
          }
        />
      ) : open?.type === "channel" ? (
        <ChannelThread
          channelId={open.id}
          title={open.name}
          icon={open.icon}
          joined={open.joined}
          isPrivate={open.isPrivate}
          onBack={back}
          onMessagePerson={(p) => void openDmWith(p)}
        />
      ) : (
        <MessagesList
          tab={tab}
          onTabChange={setTab}
          onOpenDm={(c: DmConversation) =>
            setOpen({ type: "dm", id: c.conversationId, name: c.otherName, otherId: c.otherId })
          }
          onNewChannel={() => setOpen({ type: "newChannel" })}
          onOpenChannel={(c: Channel) =>
            setOpen({
              type: "channel",
              id: c.channelId,
              name: c.name,
              icon: c.icon,
              joined: c.joined,
              isPrivate: c.private,
            })
          }
        />
      )}
    </div>
  );
}

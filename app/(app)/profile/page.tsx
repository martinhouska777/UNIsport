"use client";

import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";

export default function ProfilePage() {
  const { universityKey, logout } = useAppState();
  const router = useRouter();
  const university = getUniversity(universityKey);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-text">Profile</h1>
        <p className="mt-2 text-sm text-muted">
          Themed for{" "}
          <span className="font-medium text-primary">
            {university?.name ?? "your university"}
          </span>
          .
        </p>

        <button
          onClick={() => {
            logout();
            router.replace("/");
          }}
          className="mt-6 w-full rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface"
        >
          Log out (demo)
        </button>
      </div>
    </div>
  );
}

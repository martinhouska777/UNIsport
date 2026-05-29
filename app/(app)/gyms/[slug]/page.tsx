import Link from "next/link";
import { notFound } from "next/navigation";
import { getGym } from "@/lib/gyms";
import { IconArrowLeft } from "@/components/icons";

// TEMPORARY stub — the full gym profile screen is the next slice.
export default async function GymProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gym = getGym(slug);
  if (!gym) notFound();

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3.5 py-2.5">
        <Link href="/gyms" className="text-muted">
          <IconArrowLeft size={18} />
        </Link>
        <span className="text-[13px] font-medium text-text">{gym.name}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm text-muted">Gym profile coming in the next slice.</p>
      </div>
    </div>
  );
}

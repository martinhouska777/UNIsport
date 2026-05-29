import { notFound } from "next/navigation";
import { getGym } from "@/lib/gyms";
import GymProfile from "@/components/gyms/GymProfile";

export default async function GymProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gym = getGym(slug);
  if (!gym) notFound();

  return <GymProfile gym={gym} />;
}

import MemoriesScreen from "@/components/memories/MemoriesScreen";

/*
  /memories — the photo gallery of your logged sessions, reached from the
  Memories row on the Profile tab. Its own route rather than a sheet, so the
  phone's back gesture works and a memory can be linked to later.
*/
export default function MemoriesPage() {
  return <MemoriesScreen />;
}

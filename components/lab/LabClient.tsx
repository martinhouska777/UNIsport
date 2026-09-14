"use client";

import dynamic from "next/dynamic";

/*
  The lab reads the URL hash and localStorage for its FIRST render, so it must
  never render on the server (the two would disagree and React would complain
  about hydration). A client-only dynamic import is the supported way to say
  that; the page itself stays a server component so it can 404 in production.
*/
const DesignLab = dynamic(() => import("@/components/lab/DesignLab"), { ssr: false });

export default function LabClient() {
  return <DesignLab />;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simple Timer" },
      { name: "description", content: "A minimal timer." },
      { property: "og:title", content: "Simple Timer" },
      { property: "og:description", content: "A minimal timer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [s, setS] = useState(0);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
  return (
    <div>
      <p>{s}s</p>
      <button onClick={() => setOn(!on)}>{on ? "Stop" : "Start"}</button>
      <button onClick={() => { setOn(false); setS(0); }}>Reset</button>
    </div>
  );
}

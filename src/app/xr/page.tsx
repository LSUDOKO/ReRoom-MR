"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoIcon } from "@/components/ui";

const MRRoom = dynamic(() => import("@/components/xr/MRRoom"), { ssr: false });

/** Entry screen for the Quest experience. Open it in the Meta Quest Browser and tap Enter. */
export default function XRPage() {
  const [store, setStore] = useState<typeof import("@/components/xr/MRRoom")["xrStore"] | null>(null);
  const [support, setSupport] = useState<{ ar: boolean; vr: boolean } | null>(null);
  useEffect(() => {
    import("@/components/xr/MRRoom").then((m) => setStore(m.xrStore));
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr) return setSupport({ ar: false, vr: false });
    Promise.all([xr.isSessionSupported("immersive-ar").catch(() => false), xr.isSessionSupported("immersive-vr").catch(() => false)]).then(([ar, vr]) => setSupport({ ar, vr }));
  }, []);
  return (
    <main className="band relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div aria-hidden className="field opacity-80" />
      <div aria-hidden className="grain" />
      <MRRoom />
      <div className="relative z-10 max-w-xl">
        <LogoIcon className="mx-auto size-14 drop-shadow-[0_18px_40px_rgba(27,104,252,.55)]" />
        <p className="mono-label mt-6 text-white/60">Meta Quest · hands only · seated</p>
        <h1 className="display mt-4 text-[clamp(2.8rem,7vw,5rem)]">
          Furnish your real room <span className="chrome">with your hands.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg font-light text-white/80">
          Pinch a piece to place it on your floor, pinch-drag to move it, open the wardrobe, restyle the room. No controllers.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="glass glass--blue" disabled={!store} onClick={() => store?.enterAR()} data-magnetic>
            Enter mixed reality
          </button>
          <button className="glass" disabled={!store} onClick={() => store?.enterVR()} data-magnetic>
            Enter VR
          </button>
        </div>
        <p className="mono-label mt-6 text-white/50">
          {support === null ? "Checking your headset…" : support.ar || support.vr ? "Ready on this device" : "Open this page in the Meta Quest Browser (an emulated Quest 3 runs on localhost)"}
        </p>
        <p className="mt-8 text-sm text-mist">
          <Link href="/" className="underline-offset-4 hover:underline">
            ReRoom on the web
          </Link>
        </p>
      </div>
    </main>
  );
}

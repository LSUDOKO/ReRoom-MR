import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { Logo, LogoMark } from "./ui";

export const GITHUB_URL = "https://github.com/LSUDOKO/ReRoom-MR";

export function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

const NAV = [
  ["/#scan", "Scan"],
  ["/#remix", "Remix"],
  ["/#styles", "Styles"],
  ["/#assets", "Assets"],
  ["/#aholo", "Aholo"],
  ["/xr", "Meta Quest"],
];

/** Floating dark-glass pill. `overlay` floats it over the landing hero; elsewhere it sits on an ink strip. */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const bar = (
    <div className="relative mx-auto flex w-[min(1180px,calc(100%-24px))] items-center gap-3 md:gap-6 rounded-full bg-ink/80 py-1.5 pl-5 pr-1.5 text-paper shadow-[inset_0_1px_0_rgba(255,255,255,.14),inset_0_0_0_1px_rgba(255,255,255,.08),0_18px_40px_-20px_rgba(5,7,18,.8)] backdrop-blur-xl">
      <Link href="/" aria-label="ReRoom home" className="shrink-0">
        <Logo className="text-[18px] text-paper [&>svg]:size-6" />
      </Link>
      <nav data-nav aria-label="Sections" className="ml-auto hidden items-center gap-1 md:flex">
        {NAV.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="mono-label rounded-full px-3 py-2.5 text-mist transition-colors hover:bg-white/[.07] hover:text-white data-[active]:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      <a href={GITHUB_URL} aria-label="Source on GitHub" className="ml-auto hidden size-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-white/[.07] hover:text-white sm:flex md:ml-0">
        <GithubIcon />
      </a>
      <Link href="/studio" className="glass glass--blue glass--sm ml-auto !min-h-10 !px-5 !font-sans !text-sm !tracking-normal sm:ml-0" data-magnetic>
        <span className="sm:hidden">Studio</span>
        <span className="hidden sm:inline">Open the studio</span>
      </Link>
      <MobileNav links={NAV} />
    </div>
  );
  if (overlay) return <header className="fixed inset-x-0 top-3 z-50">{bar}</header>;
  return <header className="sticky top-0 z-50 bg-ink py-3">{bar}</header>;
}

export function SiteFooter() {
  return (
    <footer className="band overflow-hidden pb-12">
      <div className="hatch dash-x relative flex items-center justify-center gap-4 py-14 md:py-20">
        <LogoMark className="h-[clamp(3rem,9vw,7rem)] w-auto text-[#cfd3e0]" />
        <span className="chrome display text-[clamp(3.2rem,11vw,9rem)]">ReRoom</span>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center gap-6 px-5 text-center text-sm text-mist">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {[
            ["/scan", "Scan a room"],
            ["/studio", "Studio"],
            ["/xr", "Meta Quest (MR)"],
            ["/made-with-aholo", "Made with Aholo"],
            ["/privacy", "Privacy"],
            ["/terms", "Terms"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="transition-colors hover:text-white">
              {label}
            </Link>
          ))}
          <a href={GITHUB_URL} className="transition-colors hover:text-white">GitHub</a>
        </nav>
        <p className="flex items-center gap-2">
          Built on
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/aholo.svg" alt="Aholo" className="h-4 w-auto opacity-90" />
          by Manycore
        </p>
        <p className="mono-label text-mist/70">Every 3D object on this site was generated with Aholo</p>
      </div>
    </footer>
  );
}

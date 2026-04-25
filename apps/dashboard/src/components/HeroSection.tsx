import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import yieldfyLogo from "@/assets/yieldfy-logo.png";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_074215_04640ca7-042c-45d6-bb56-58b1e8a42489.mp4";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Architecture", href: "#architecture" },
  { label: "Venues", href: "#venues" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const CornerAccent = ({ className }: { className: string }) => (
  <span className={`absolute h-[7px] w-[7px] corner-accent ${className}`} />
);

const HeroSection = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#0F1923]">
      {/* Background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1923]/60 via-[#0F1923]/25 to-[#0F1923]/40" />

      {/* Animated blobs */}
      <div className="blob absolute -left-[200px] top-[10%] h-[700px] w-[700px] opacity-[0.35]" />
      <div className="blob absolute -right-[150px] bottom-[5%] h-[800px] w-[800px] opacity-[0.35]" style={{ animationDirection: "reverse" }} />

      {/* Content layer */}
      <div className="relative z-10 flex min-h-[100svh] flex-col">
        {/* Navigation */}
        <nav
          className="flex items-center justify-between px-5 py-4 md:px-10 md:py-5"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <a href="/" className="flex items-center gap-2 font-barlow text-lg md:text-xl font-light tracking-tight text-white">
            <img src={yieldfyLogo} alt="Yieldfy logo" className="h-6 md:h-7 w-auto invert" />
            <span>yieldfy<span className="text-white">.</span></span>
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="rounded-md px-4 py-2 font-barlow text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <Link
            to="/dashboard"
            className="hidden md:inline-flex btn-primary !py-2 !px-5"
          >
            Launch App
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-md text-white hover:bg-white/10"
          >
            <Menu size={24} />
          </button>
        </nav>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden flex flex-col items-center justify-center gap-8 bg-[#0F1923]/95 backdrop-blur-xl">
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-5 inline-flex items-center justify-center h-11 w-11 rounded-md text-white hover:bg-white/10"
              style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            >
              <X size={24} />
            </button>
            <ul className="flex flex-col items-center gap-6">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="font-barlow text-xl font-light text-white/90 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="btn-primary min-h-[44px] inline-flex items-center justify-center"
            >
              Launch App
            </Link>
          </div>
        )}

        {/* Hero content */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 md:mb-10">
            <div className="glass-pill glass-pill-dark">
              <div className="glass-pill-inner !text-[10px] md:!text-xs">
                <span className="font-barlow tracking-wide">XRP × Solana</span>
              </div>
            </div>
          </div>

          {/* Headline with corner accents */}
          <div className="relative px-4 py-6 sm:px-8 mx-2 md:mx-0">
            <CornerAccent className="left-0 top-0" />
            <CornerAccent className="right-0 top-0" />
            <CornerAccent className="bottom-0 left-0" />
            <CornerAccent className="bottom-0 right-0" />

            <h1 className="text-center">
              <span className="block font-barlow text-[36px] sm:text-[52px] lg:text-[72px] font-light leading-[1.1] text-white">
                Your XRPL treasuries, now
              </span>
              <span className="block font-instrument text-[36px] sm:text-[52px] lg:text-[72px] italic leading-[1.1] gradient-text metric-glow">
                earning Solana yield
              </span>
            </h1>
          </div>

          <p className="mt-6 max-w-lg text-center font-barlow text-base md:text-lg text-white/75 px-2">
            An autonomous routing agent that bridges tokenized treasuries to the best Solana
            yield venues — institutional, non-custodial, fully auditable.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none">
            <Link to="/dashboard" className="btn-primary w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center">
              Launch App
            </Link>
            <a
              href="https://github.com/yieldfy"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary-dark w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

import yieldfyLogo from "@/assets/yieldfy-logo.png";
import FloatingCoin from "./FloatingCoin";

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
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#0F1923]">
      {/* Background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Lighter gradient overlay so blobs glow through */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1923]/60 via-[#0F1923]/25 to-[#0F1923]/40" />

      {/* Animated blobs (warm light through video) */}
      <div className="blob absolute -left-[200px] top-[10%] h-[700px] w-[700px] opacity-[0.35]" />
      <div className="blob absolute -right-[150px] bottom-[5%] h-[800px] w-[800px] opacity-[0.35]" style={{ animationDirection: "reverse" }} />

      {/* Floating tokens */}
      <FloatingCoin
        type="xrp"
        size={140}
        rotate={-12}
        className="absolute left-[6%] top-[28%] z-[5] hidden md:block"
      />
      <FloatingCoin
        type="sol"
        size={140}
        rotate={14}
        delay
        slow
        className="absolute right-[6%] top-[34%] z-[5] hidden md:block"
      />
      <FloatingCoin
        type="xrp"
        size={70}
        rotate={-8}
        className="absolute left-[8%] bottom-[18%] z-[5] hidden lg:block opacity-80"
        slow
      />
      <FloatingCoin
        type="sol"
        size={70}
        rotate={10}
        delay
        className="absolute right-[10%] bottom-[22%] z-[5] hidden lg:block opacity-80"
      />

      {/* Content layer */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Navigation (transparent over hero) */}
        <nav className="flex items-center justify-between px-10 py-5">
          <a href="/" className="flex items-center gap-2 font-barlow text-xl font-light tracking-tight text-white">
            <img src={yieldfyLogo} alt="Yieldfy logo" className="h-7 w-auto invert" />
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

          <button disabled className="btn-primary !py-2 !px-5 opacity-60 cursor-not-allowed">Coming soon</button>
        </nav>

        {/* Hero content */}
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* Featured glass pill (dark variant for hero) */}
          <div className="glass-pill glass-pill-dark mb-10">
            <div className="glass-pill-inner">
              <span className="font-barlow tracking-wide">XRP × Solana</span>
            </div>
          </div>

          {/* Headline with corner accents */}
          <div className="relative px-4 py-6 sm:px-8">
            <CornerAccent className="left-0 top-0" />
            <CornerAccent className="right-0 top-0" />
            <CornerAccent className="bottom-0 left-0" />
            <CornerAccent className="bottom-0 right-0" />

            <h1 className="text-center">
              <span className="block font-barlow text-[40px] sm:text-[56px] md:text-[72px] font-light leading-[1.1] text-white">
                Your XRPL treasuries, now
              </span>
              <span className="block font-instrument text-[40px] sm:text-[56px] md:text-[72px] italic leading-[1.1] gradient-text metric-glow">
                earning Solana yield
              </span>
            </h1>
          </div>

          {/* Sub-headline */}
          <p className="mt-6 max-w-lg text-center font-barlow text-base text-white/75">
            An autonomous routing agent that bridges tokenized treasuries to the best Solana
            yield venues — institutional, non-custodial, fully auditable.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex gap-4">
            <button disabled className="btn-primary opacity-60 cursor-not-allowed">Coming soon</button>
            <button disabled className="btn-secondary-dark opacity-60 cursor-not-allowed">Coming soon</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

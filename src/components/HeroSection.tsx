const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_074215_04640ca7-042c-45d6-bb56-58b1e8a42489.mp4";

const NAV_LINKS = ["Work", "Services", "About", "Blog", "Contact"];

const CornerAccent = ({ className }: { className: string }) => (
  <span className={`absolute h-[7px] w-[7px] bg-hero-text ${className}`} />
);

const HeroSection = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />

      {/* Content layer */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-10 py-6">
          <a
            href="/"
            className="font-barlow text-lg font-semibold tracking-wide text-hero-text"
          >
            STUDIO
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link}>
                <a
                  href={`#${link.toLowerCase()}`}
                  className="rounded-sm px-4 py-2 font-barlow text-sm font-medium text-hero-text transition-colors hover:bg-hero-nav-hover"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>

          <button className="rounded-hero bg-hero-cta px-5 py-2 font-barlow text-sm font-medium text-hero-cta-foreground transition-colors hover:bg-hero-cta-hover">
            Get in touch
          </button>
        </nav>

        {/* Hero content */}
        <div className="flex flex-1 flex-col items-center justify-end pb-[250px]">
          {/* Featured badge */}
          <div className="mb-10 rounded-full bg-hero-glass-outer p-[2px] backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-full bg-hero-glass-inner px-5 py-1.5 backdrop-blur-md">
              <span className="font-barlow text-xs font-medium tracking-wide text-hero-text">
                ★ Featured in Fortune
              </span>
            </div>
          </div>

          {/* Headline container with corner accents */}
          <div className="relative px-8 py-6">
            <CornerAccent className="left-0 top-0" />
            <CornerAccent className="right-0 top-0" />
            <CornerAccent className="bottom-0 left-0" />
            <CornerAccent className="bottom-0 right-0" />

            <h1 className="text-center">
              <span className="block font-barlow text-[64px] font-light leading-[1.1] text-hero-text">
                Your XRPL treasuries, now
              </span>
              <span className="block font-instrument text-[64px] italic leading-[1.1] text-hero-text">
                earning Solana yield
              </span>
            </h1>
          </div>

          {/* Sub-headline */}
          <p className="mt-6 max-w-lg text-center font-barlow text-base text-hero-text-muted">
            We craft scroll-stopping short-form content that drives millions of
            organic views, turning brands into cultural moments.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex gap-4">
            <button className="rounded-hero bg-hero-cta px-7 py-3 font-barlow text-sm font-medium text-hero-cta-foreground transition-colors hover:bg-hero-cta-hover">
              View our work
            </button>
            <button className="rounded-hero bg-hero-cta px-7 py-3 font-barlow text-sm font-medium text-hero-cta-foreground transition-colors hover:bg-hero-cta-hover">
              Book a call
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

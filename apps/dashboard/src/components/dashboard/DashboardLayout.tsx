import { ReactNode, useState } from "react";
import { LayoutGrid, ArrowDownCircle, Layers, BarChart3, Clock, Settings, Menu, ExternalLink, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import yieldfyLogo from "@/assets/yieldfy-logo.png";
import WalletMenu from "@/components/dashboard/WalletMenu";
import NotificationsBell from "@/components/dashboard/NotificationsBell";
import NetworkSwitcher from "@/components/dashboard/NetworkSwitcher";

export type ViewKey = "overview" | "deposit" | "positions" | "venues" | "history" | "settings";

const NAV: { key: ViewKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "deposit", label: "Deposit", icon: ArrowDownCircle },
  { key: "positions", label: "Positions", icon: Layers },
  { key: "venues", label: "Venues", icon: BarChart3 },
  { key: "history", label: "History", icon: Clock },
  { key: "settings", label: "Settings", icon: Settings },
];

const TITLES: Record<ViewKey, string> = {
  overview: "Overview",
  deposit: "Deposit",
  positions: "Positions",
  venues: "Venues",
  history: "History",
  settings: "Settings",
};

interface Props {
  current: ViewKey;
  onChange: (v: ViewKey) => void;
  onDepositClick: () => void;
  children: ReactNode;
}

const NavItem = ({ item, active, onClick }: { item: typeof NAV[number]; active: boolean; onClick: () => void }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
        active ? "text-[#0F1923]" : "text-[#0F1923]/50 hover:text-[#0F1923]/80 hover:bg-white/40"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full gradient-bg" />}
      <Icon size={18} />
      <span className="font-barlow">{item.label}</span>
    </button>
  );
};

const DashboardLayout = ({ current, onChange, onDepositClick, children }: Props) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const Sidebar = (
    <aside
      className="flex h-full w-[280px] flex-col border-r"
      style={{
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(40px) saturate(1.4)",
        WebkitBackdropFilter: "blur(40px) saturate(1.4)",
        borderColor: "rgba(15,25,35,0.06)",
      }}
    >
      <Link
        to="/"
        aria-label="Back to landing"
        className="flex items-center gap-2 px-6 py-5 transition-opacity hover:opacity-70"
      >
        <img src={yieldfyLogo} alt="Yieldfy" className="h-7 w-auto" />
        <span className="font-barlow text-xl font-light text-[#0F1923]">
          yieldfy<span style={{ color: "#2EC4B6" }}>.</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={current === item.key}
            onClick={() => {
              onChange(item.key);
              setDrawerOpen(false);
            }}
          />
        ))}
      </nav>
      <div className="border-t border-[#0F1923]/06 p-4">
        <a
          href="https://t.me/Yieldfy"
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-1 rounded-xl bg-white/50 px-3 py-2.5 backdrop-blur transition-colors hover:bg-white/70"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F1923]/[0.04] text-[#0F1923]/70 group-hover:bg-[#0F1923]/[0.08] group-hover:text-[#0F1923] transition-colors">
              <MessageCircle size={14} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-[#0F1923]">Need help?</span>
              <span className="text-[10px] text-[#0F1923]/55">Join our Telegram</span>
            </div>
            <ExternalLink size={11} className="ml-auto text-[#0F1923]/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F1923]/70" />
          </div>
        </a>
      </div>
    </aside>
  );

  return (
    <div className="relative flex min-h-screen w-full" style={{ background: "#FAF3E0" }}>
      {/* ambient blobs */}
      <div className="blob absolute -left-[200px] top-[20%] h-[500px] w-[500px] opacity-[0.12] pointer-events-none" />
      <div className="blob absolute -right-[150px] bottom-[10%] h-[600px] w-[600px] opacity-[0.10] pointer-events-none" style={{ animationDirection: "reverse" }} />

      {/* Desktop sidebar */}
      <div className="hidden md:block relative z-10">{Sidebar}</div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="relative z-10 h-full">{Sidebar}</div>
          <div className="flex-1 bg-[#0F1923]/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 px-4 md:px-8 glass-nav"
          style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-[#0F1923] hover:bg-white/40"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="font-barlow text-lg md:text-xl font-medium text-[#0F1923] truncate">{TITLES[current]}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <NetworkSwitcher />
            <NotificationsBell />
            <WalletMenu />
            <button onClick={onDepositClick} className="btn-primary !py-2 !px-4 md:!px-5 text-xs md:text-sm">
              Deposit
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-[60px] items-center justify-around glass-nav border-t"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          borderColor: "rgba(15,25,35,0.06)",
        }}
      >
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors ${
                active ? "text-[#0F1923]" : "text-[#0F1923]/40"
              }`}
            >
              {active && <span className="absolute top-0 h-[3px] w-8 rounded-full gradient-bg" />}
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default DashboardLayout;

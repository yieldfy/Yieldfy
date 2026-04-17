export const WALLET = "0x7F3a...9d2B";

export const overviewMetrics = [
  { label: "Total Deposited", value: "$2,450,000", delta: "+12.4%", deltaLabel: "this month", up: true },
  { label: "Current Yield", value: "11.8%", delta: "APY", deltaLabel: "30d avg", up: true },
  { label: "Yield Earned", value: "$24,312", delta: "+$1,204", deltaLabel: "this week", up: true },
  { label: "Active Venues", value: "3", delta: "of 6", deltaLabel: "available", up: true },
];

export const yieldSeries = Array.from({ length: 30 }).map((_, i) => {
  const base = 11 + Math.sin(i / 3) * 3 + (Math.random() - 0.5) * 1.5;
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    yield: Math.max(8, Math.min(16.2, +base.toFixed(2))),
  };
});

export const activePositions = [
  { asset: "OUSG", color: "#2EC4B6", amount: "$1,500,000", venue: "Kamino", apy: "14.2%", time: "3d 14h" },
  { asset: "USDY", color: "#3B82F6", amount: "$650,000", venue: "MarginFi", apy: "10.4%", time: "1d 02h" },
  { asset: "OUSG", color: "#E84855", amount: "$300,000", venue: "Drift", apy: "9.1%", time: "6h" },
];

export const recentActivity = [
  { date: "Today", action: "Rebalance", asset: "OUSG", amount: "$1.5M", venue: "MarginFi → Kamino", status: "Complete" },
  { date: "Yesterday", action: "Yield Claim", asset: "USDY", amount: "$1,204", venue: "Kamino", status: "Complete" },
  { date: "2d ago", action: "Deposit", asset: "OUSG", amount: "$500,000", venue: "Kamino", status: "Complete" },
  { date: "4d ago", action: "Rebalance", asset: "OUSG", amount: "$1.0M", venue: "Drift → MarginFi", status: "Complete" },
  { date: "1w ago", action: "Deposit", asset: "USDY", amount: "$950,000", venue: "MarginFi", status: "Complete" },
];

export type Venue = {
  name: string;
  strategy: string;
  tvl: string;
  apy: number;
  apy7d: number;
  utilization: number;
  oracle: string;
  audit: number;
  risk: string;
  score: number;
  active?: boolean;
};

export const venues: Venue[] = [
  { name: "Kamino", strategy: "Lending", tvl: "$1.2B", apy: 14.2, apy7d: 13.8, utilization: 78, oracle: "Healthy", audit: 92, risk: "Low", score: 94, active: true },
  { name: "Jito", strategy: "Liquid Stake", tvl: "$2.4B", apy: 8.6, apy7d: 8.4, utilization: 91, oracle: "Healthy", audit: 95, risk: "Low", score: 88 },
  { name: "MarginFi", strategy: "Lending", tvl: "$640M", apy: 10.1, apy7d: 10.4, utilization: 64, oracle: "Healthy", audit: 89, risk: "Low", score: 82 },
  { name: "Drift", strategy: "Perps LP", tvl: "$420M", apy: 16.4, apy7d: 15.2, utilization: 72, oracle: "Healthy", audit: 86, risk: "Med", score: 76 },
  { name: "Meteora", strategy: "DLMM", tvl: "$310M", apy: 18.2, apy7d: 17.0, utilization: 58, oracle: "Healthy", audit: 80, risk: "Med", score: 71 },
  { name: "Solend", strategy: "Lending", tvl: "$180M", apy: 9.4, apy7d: 9.1, utilization: 49, oracle: "Healthy", audit: 84, risk: "Low", score: 68 },
];

export const decisionLog = [
  { time: "12m ago", winner: "Kamino", note: "Score 94 vs MarginFi 82 — rebalanced 1.5M OUSG", rebalanced: true },
  { time: "2h ago", winner: "Kamino", note: "Score 94 vs Drift 76 — held", rebalanced: false },
  { time: "6h ago", winner: "MarginFi", note: "Score 82 vs Solend 68 — held", rebalanced: false },
  { time: "1d ago", winner: "Kamino", note: "Score 91 vs Jito 88 — held", rebalanced: false },
  { time: "2d ago", winner: "MarginFi", note: "Score 84 vs Drift 79 — rebalanced 1.0M OUSG", rebalanced: true },
];

export const historyEntries = Array.from({ length: 18 }).map((_, i) => {
  const types = ["deposit", "rebalance", "yield", "withdraw"] as const;
  const t = types[i % 4];
  const d = new Date();
  d.setDate(d.getDate() - i * 2);
  const map = {
    deposit: { color: "#2EC4B6", desc: "Deposited 500,000 OUSG into Kamino", reason: "Initial allocation routed to highest-scoring venue", amount: "$500,000", apy: "14.2%" },
    rebalance: { color: "#3B82F6", desc: "Rebalanced 1,500,000 OUSG from MarginFi → Kamino", reason: "Kamino APY 14.2% exceeded MarginFi 10.1% by 410bps, above 200bps threshold", amount: "$1,500,000", apy: "14.2%" },
    yield: { color: "#A855F7", desc: "Claimed yield on USDY position", reason: "Auto-claim threshold reached ($1,000)", amount: "$1,204", apy: "10.4%" },
    withdraw: { color: "#E84855", desc: "Withdrew 250,000 OUSG to XRPL", reason: "User-initiated withdrawal", amount: "$250,000", apy: "—" },
  };
  return {
    id: i,
    type: t,
    timestamp: d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    ...map[t],
  };
});

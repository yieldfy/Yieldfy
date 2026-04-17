const SettingsView = () => (
  <div className="max-w-2xl space-y-6">
    <div className="glass-card p-6">
      <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-4">Account</h3>
      <div className="space-y-3 text-sm">
        <Row label="Connected Wallet" value="0x7F3a...9d2B" />
        <Row label="Network" value="Solana Mainnet" />
        <Row label="Email Notifications" value="ops@treasury.example" />
      </div>
    </div>
    <div className="glass-card p-6">
      <h3 className="font-barlow text-xl font-medium text-[#0F1923] mb-4">Risk Defaults</h3>
      <div className="space-y-3 text-sm">
        <Row label="Default Profile" value="Balanced" />
        <Row label="Min APY Delta to Rebalance" value="200 bps" />
        <Row label="Auto-claim Threshold" value="$1,000" />
      </div>
    </div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-[#0F1923]/5 pb-3 last:border-0">
    <span className="text-[#0F1923]/60">{label}</span>
    <span className="text-[#0F1923] font-medium">{value}</span>
  </div>
);

export default SettingsView;

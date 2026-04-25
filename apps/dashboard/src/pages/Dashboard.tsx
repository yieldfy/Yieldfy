import { useState } from "react";
import DashboardLayout, { ViewKey } from "@/components/dashboard/DashboardLayout";
import WalletConnectGate from "@/components/dashboard/WalletConnectGate";
import OverviewView from "@/components/dashboard/views/OverviewView";
import DepositView from "@/components/dashboard/views/DepositView";
import PositionsView from "@/components/dashboard/views/PositionsView";
import VenuesView from "@/components/dashboard/views/VenuesView";
import HistoryView from "@/components/dashboard/views/HistoryView";
import SettingsView from "@/components/dashboard/views/SettingsView";

const Dashboard = () => {
  const [view, setView] = useState<ViewKey>("overview");

  const render = () => {
    switch (view) {
      case "overview": return <OverviewView />;
      case "deposit": return <DepositView />;
      case "positions": return <PositionsView />;
      case "venues": return <VenuesView />;
      case "history": return <HistoryView />;
      case "settings": return <SettingsView />;
    }
  };

  return (
    <WalletConnectGate>
      <DashboardLayout current={view} onChange={setView} onDepositClick={() => setView("deposit")}>
        {render()}
      </DashboardLayout>
    </WalletConnectGate>
  );
};

export default Dashboard;

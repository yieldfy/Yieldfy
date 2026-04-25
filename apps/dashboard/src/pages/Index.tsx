import { useEffect } from "react";
import { toast } from "sonner";
import HeroSection from "@/components/HeroSection";
import YieldfyLanding from "@/components/YieldfyLanding";
import { consumeDisconnectMessage } from "@/hooks/useWalletGuard";

const Index = () => {
  // Surface the wallet-guard's reason for kicking the user back here.
  // sessionStorage-based so it survives the hard navigation but only
  // fires once.
  useEffect(() => {
    const msg = consumeDisconnectMessage();
    if (msg) toast.message(msg);
  }, []);

  return (
    <>
      <HeroSection />
      <YieldfyLanding />
    </>
  );
};

export default Index;

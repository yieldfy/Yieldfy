import xrpCoin from "@/assets/coin-xrp.png";
import solCoin from "@/assets/coin-solana.png";

type Props = {
  type: "xrp" | "sol";
  className?: string;
  size?: number;
  rotate?: number;
  delay?: boolean;
  slow?: boolean;
};

const FloatingCoin = ({
  type,
  className = "",
  size = 96,
  rotate = 0,
  delay = false,
  slow = false,
}: Props) => {
  const src = type === "xrp" ? xrpCoin : solCoin;
  return (
    <img
      src={src}
      alt={type === "xrp" ? "XRP token" : "Solana token"}
      aria-hidden="true"
      className={`pointer-events-none select-none coin-float ${slow ? "coin-float-slow" : ""} ${delay ? "coin-float-delay" : ""} ${className}`}
      style={
        {
          width: size,
          height: size,
          "--coin-rot": `${rotate}deg`,
        } as React.CSSProperties
      }
    />
  );
};

export default FloatingCoin;

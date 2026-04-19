import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ title, description, action, className = "" }: Props) => (
  <div
    className={`flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl bg-white/30 border border-dashed border-[#0F1923]/10 ${className}`}
  >
    <div className="font-barlow text-sm font-medium text-[#0F1923]/80">{title}</div>
    {description && (
      <div className="mt-1.5 text-xs text-[#0F1923]/50 max-w-xs">{description}</div>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;

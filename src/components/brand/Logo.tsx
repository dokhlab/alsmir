import { NavLink } from "@/components/NavLink";
import alsmirLogo from "@/assets/alsmir-logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <NavLink to="/" className={`inline-flex items-center font-semibold tracking-tight text-xl ${className}`}>
      <img src={alsmirLogo} alt="" aria-hidden="true" className="h-8 w-auto mr-2" />
      <span className="text-primary-dark">ALS</span>
      <span className="text-primary">miR</span>
    </NavLink>
  );
}

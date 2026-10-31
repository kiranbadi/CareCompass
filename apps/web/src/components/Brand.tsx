import { HeartHandshake } from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <HeartHandshake size={25} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span>
        CareBridge<span className="brand-dot">.</span>
      </span>
    </span>
  );
}

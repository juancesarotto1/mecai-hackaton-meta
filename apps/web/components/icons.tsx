import type { SVGProps } from "react";
const Base = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);
export const PowerIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 2v10" />
    <path d="M6.3 5.8a8 8 0 1 0 11.4 0" />
  </Base>
);
export const XrayIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8l8 8M16 8l-8 8" />
  </Base>
);
export const ExplodeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 8l4 4-4 4M20 8l-4 4 4 4M10 4l2-2 2 2M10 20l2 2 2-2" />
    <circle cx="12" cy="12" r="2" />
  </Base>
);
export const FocusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);
export const ResetIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Base>
);
export const MicIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
  </Base>
);
export const SendIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M22 2L9 15" />
    <path d="M22 2l-7 20-4-9-9-4z" />
  </Base>
);
export const UndoIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M9 7l-5 5 5 5" />
    <path d="M4 12h9a7 7 0 0 1 7 7" />
  </Base>
);
export const VrIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M3 8h18v8a3 3 0 0 1-3 3h-2l-3-4h-2l-3 4H6a3 3 0 0 1-3-3z" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="16" cy="12" r="2" />
  </Base>
);
export const GaugeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 14l4-4" />
    <path d="M7 18h10" />
  </Base>
);
export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M9 18l6-6-6-6" />
  </Base>
);

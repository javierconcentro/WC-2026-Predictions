export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#101828" />
      {/* Two interlocking S-curves — left S and right Z */}
      <path
        d="M 14,12 C 14,25 50,25 50,32 C 50,39 14,47 14,52"
        stroke="white" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      <path
        d="M 50,12 C 50,25 14,25 14,32 C 14,39 50,47 50,52"
        stroke="white" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      {/* Six nodes: top-left, top-right, mid-right, mid-left, bot-left, bot-right */}
      <circle cx="14" cy="12" r="5" fill="white" />
      <circle cx="50" cy="12" r="5" fill="white" />
      <circle cx="50" cy="32" r="5" fill="white" />
      <circle cx="14" cy="32" r="5" fill="white" />
      <circle cx="14" cy="52" r="5" fill="white" />
      <circle cx="50" cy="52" r="5" fill="white" />
    </svg>
  );
}

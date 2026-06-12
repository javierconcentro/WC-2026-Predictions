// Approximation of the Concentro mark: navy squircle, white dot-connector motif
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="17" fill="#101828" />
      <path
        d="M22 17 C22 32 42 32 42 47"
        stroke="white"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42" cy="17" r="5.5" fill="white" />
      <circle cx="22" cy="47" r="5.5" fill="white" />
      <circle cx="13" cy="32" r="4.5" fill="white" />
      <circle cx="51" cy="32" r="4.5" fill="white" />
    </svg>
  );
}

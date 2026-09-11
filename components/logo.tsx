// components/logo.tsx
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: "var(--meesho-purple)" }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32" fill="none">
          {/* Original twin-arch "M" mark - own geometry, same brand color language */}
          <path
            d="M5 25V13a4 4 0 0 1 4-4 4 4 0 0 1 4 4v4"
            stroke="var(--meesho-orange)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M13 25V13a4 4 0 0 1 4-4 4 4 0 0 1 4 4v12"
            stroke="var(--meesho-orange)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="leading-none">
        <div className="font-bold text-slate-900" style={{ fontSize: size * 0.34 }}>Meesho Logistics System</div>
      </div>
    </div>
  );
}
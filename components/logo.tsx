// components/logo.tsx
export function Logo({ size = 36 }: { size?: number }) {
    return (
      <div className="flex items-center gap-2.5">
        <div
          className="rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ width: size, height: size, backgroundColor: "var(--meesho-purple)" }}
        >
          <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
            {/* Stylized "R" arch — our own mark, same shape language as the brand's arches */}
            <path
              d="M4 20V6a2 2 0 0 1 2-2h6a5 5 0 0 1 5 5 5 5 0 0 1-3.2 4.66L17 20"
              stroke="var(--meesho-orange)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="9" r="1.4" fill="var(--meesho-orange)" />
          </svg>
        </div>
        <div className="leading-none">
          <div className="font-bold text-slate-900" style={{ fontSize: size * 0.36 }}>RTO Intelligence</div>
        </div>
      </div>
    );
  }
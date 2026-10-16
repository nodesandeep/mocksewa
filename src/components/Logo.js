import Link from "next/link";

export default function Logo({
  className = "",
  light = false,
  compact = false,
}) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 group hover:opacity-100 transition-all ${className}`}
    >
      {/* 🚀 CSS TEXT LOGO — No image dependency */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-black tracking-tight leading-none ${compact ? 'text-[20px]' : 'text-[22px]'}`}
          style={{
            textShadow: light
              ? "2px 2px 8px rgba(59,130,246,0.3)"
              : "1px 1px 4px rgba(30,58,138,0.12)",
            fontFamily: "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif",
          }}
        >
          <span className={light ? "text-blue-400" : "text-[#1E3A8A]"}>my</span>
          <span
            className="text-[#C41E24] font-black"
            style={{ fontSize: "1.12em" }}
          >
            MOCK
          </span>
          <span className={light ? "text-blue-400" : "text-[#1E3A8A]"}>
            sewa
          </span>
        </span>
        {!compact && (
          <span
            className={`text-[7px] font-bold tracking-[0.15em] mt-0.5 ${light ? "text-slate-300" : "text-slate-400 dark:text-slate-500"}`}
            style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif" }}
          >
            Precision Practice, Proven{" "}
            <span className="text-[#C41E24] font-black">S</span>uccess.
          </span>
        )}
      </div>
    </Link>
  );
}

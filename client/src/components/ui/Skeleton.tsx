/** Skeleton loader components — used while data is loading.
 *  CSS animations are defined in admin.css (.skeleton, @keyframes shimmer). */

export function SkeletonText({ width, height = 14, className = "" }: { width?: string | number; height?: number; className?: string }) {
  return <div className={`skeleton skeleton-text ${className}`} style={{ width, height }} />;
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="skeleton-row">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${60 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: "8px 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <SkeletonText width="40%" height={20} />
      <SkeletonText width="70%" />
      <SkeletonText width="55%" />
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ textAlign: "center", padding: "24px 16px" }}>
          <SkeletonText width={60} height={32} className="" />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SkeletonText width={80} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

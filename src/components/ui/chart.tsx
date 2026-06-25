"use client";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  showValues?: boolean;
}

export function BarChart({ data, height = 200, showValues = true }: BarChartProps) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(20, Math.min(60, 600 / data.length - 8));

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (height - 24);
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center justify-end h-full"
          >
            {showValues && (
              <span className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                {d.value}
              </span>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
              style={{
                height: Math.max(4, barHeight),
                backgroundColor: d.color || "#2563eb",
                maxWidth: barWidth,
              }}
            />
            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface PieChartProps {
  data: DataPoint[];
  size?: number;
}

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#8b5cf6", "#ec4899"];

export function PieChart({ data, size = 180 }: PieChartProps) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;

  const slices = data.map((d, i) => {
    const percentage = d.value / total;
    const startAngle = cumulative * 360;
    cumulative += percentage;
    const endAngle = cumulative * 360;
    return { ...d, percentage, startAngle, endAngle, color: d.color || COLORS[i % COLORS.length] };
  });

  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const r = size / 2 - 4;

  const paths = slices.map((s, i) => {
    const x1 = size / 2 + r * Math.cos(toRad(s.startAngle));
    const y1 = size / 2 + r * Math.sin(toRad(s.startAngle));
    const x2 = size / 2 + r * Math.cos(toRad(s.endAngle));
    const y2 = size / 2 + r * Math.sin(toRad(s.endAngle));
    const large = s.endAngle - s.startAngle > 180 ? 1 : 0;

    return (
      <path
        key={i}
        d={`M ${size / 2} ${size / 2} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={s.color}
        stroke="white"
        strokeWidth={2}
      />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        {paths}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-lg font-bold fill-gray-900"
        >
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-medium text-gray-900">
              {Math.round(s.percentage * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

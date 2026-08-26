"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { SustainedUsageTrendPoint } from "@/lib/dashboard-types";
import styles from "./SustainedUsageTrendPlot.module.css";

const WIDTH = 920;
const HEIGHT = 260;
const PAD_X = 28;
const PAD_Y = 24;
const TOOLTIP_WIDTH = 248;

function pointX(index: number, count: number) {
  const chartWidth = WIDTH - PAD_X * 2;
  return PAD_X + (count === 1 ? chartWidth / 2 : (index / (count - 1)) * chartWidth);
}

function pathFor(values: number[], max: number) {
  const spanX = WIDTH - PAD_X * 2;
  const spanY = HEIGHT - PAD_Y * 2;
  return values.map((value, index) => {
    const x = PAD_X + (values.length === 1 ? spanX / 2 : (index / (values.length - 1)) * spanX);
    const y = PAD_Y + spanY - (value / Math.max(max, 1)) * spanY;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function SustainedUsageTrendPlot({
  points,
  labels
}: {
  points: SustainedUsageTrendPoint[];
  labels: {
    users: string;
    rate: string;
    added: string;
    exited: string;
    hoverHint: string;
  };
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(
    ...points.flatMap((point) => [point.continuousUsers, point.newContinuousUsers, point.exitedContinuousUsers]),
    1
  );
  const chartWidth = WIDTH - PAD_X * 2;
  const chartHeight = HEIGHT - PAD_Y * 2;
  const barWidth = Math.max(1.4, Math.min(5, chartWidth / points.length / 2.5));
  const activePoint = activeIndex === null ? null : points[activeIndex];

  function updateFromPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.max(0, Math.min(1, (svgX - PAD_X) / chartWidth));
    setActiveIndex(Math.round(ratio * (points.length - 1)));
  }

  function moveWithKeyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setActiveIndex((current) => {
      if (event.key === "Home") return 0;
      if (event.key === "End") return points.length - 1;
      const start = current ?? points.length - 1;
      return Math.max(0, Math.min(points.length - 1, start + (event.key === "ArrowLeft" ? -1 : 1)));
    });
  }

  const x = activeIndex === null ? 0 : pointX(activeIndex, points.length);
  const activeY = activePoint
    ? PAD_Y + chartHeight - (activePoint.continuousUsers / max) * chartHeight
    : 0;
  const tooltipX = Math.max(PAD_X + 4, Math.min(WIDTH - PAD_X - TOOLTIP_WIDTH - 4, x - TOOLTIP_WIDTH / 2));

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      tabIndex={0}
      aria-label={activePoint
        ? `${activePoint.date}，${labels.users} ${activePoint.continuousUsers}，${labels.rate} ${activePoint.percentage.toFixed(1)}%，${labels.added} ${activePoint.newContinuousUsers}，${labels.exited} ${activePoint.exitedContinuousUsers}`
        : labels.hoverHint}
      onPointerMove={updateFromPointer}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex((value) => value ?? points.length - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={moveWithKeyboard}
    >
      {[0, 0.5, 1].map((ratio) => (
        <line
          key={ratio}
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={PAD_Y + chartHeight * ratio}
          y2={PAD_Y + chartHeight * ratio}
          className={styles.gridLine}
        />
      ))}
      {points.map((point, index) => {
        const barX = pointX(index, points.length);
        const addedHeight = (point.newContinuousUsers / max) * chartHeight;
        const exitedHeight = (point.exitedContinuousUsers / max) * chartHeight;
        return (
          <g key={point.date}>
            <rect
              x={barX - barWidth - 0.5}
              y={HEIGHT - PAD_Y - addedHeight}
              width={barWidth}
              height={addedHeight}
              rx={barWidth / 2}
              className={styles.addedBar}
            />
            <rect
              x={barX + 0.5}
              y={HEIGHT - PAD_Y - exitedHeight}
              width={barWidth}
              height={exitedHeight}
              rx={barWidth / 2}
              className={styles.exitedBar}
            />
          </g>
        );
      })}
      <path d={pathFor(points.map((point) => point.continuousUsers), max)} className={styles.userPath} />

      {activePoint ? (
        <g className={styles.inspection} aria-hidden="true">
          <line x1={x} x2={x} y1={PAD_Y} y2={HEIGHT - PAD_Y} className={styles.inspectionLine} />
          <circle cx={x} cy={activeY} r="4" className={styles.userMarker} />
          <g transform={`translate(${tooltipX}, 8)`} className={styles.tooltip}>
            <rect width={TOOLTIP_WIDTH} height="68" rx="10" />
            <text x="12" y="18" className={styles.tooltipDate}>{activePoint.date}</text>
            <text x="12" y="40">{labels.users} <tspan>{activePoint.continuousUsers}</tspan></text>
            <text x="132" y="40">{labels.rate} <tspan>{activePoint.percentage.toFixed(1)}%</tspan></text>
            <text x="12" y="57">{labels.added} <tspan>+{activePoint.newContinuousUsers}</tspan></text>
            <text x="132" y="57">{labels.exited} <tspan>-{activePoint.exitedContinuousUsers}</tspan></text>
          </g>
        </g>
      ) : null}
      <rect x={PAD_X} y={PAD_Y} width={chartWidth} height={chartHeight} className={styles.pointerSurface} />
    </svg>
  );
}

"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DashboardData } from "@/lib/dashboard-types";
import styles from "./InteractiveTrendPlot.module.css";

const WIDTH = 920;
const HEIGHT = 260;
const PAD_X = 28;
const PAD_Y = 24;
const TOOLTIP_WIDTH = 176;

function pathFor(values: number[], max: number) {
  const spanX = WIDTH - PAD_X * 2;
  const spanY = HEIGHT - PAD_Y * 2;
  return values.map((value, index) => {
    const x = PAD_X + (values.length === 1 ? spanX / 2 : (index / (values.length - 1)) * spanX);
    const y = PAD_Y + spanY - (value / Math.max(max, 1)) * spanY;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function pointX(index: number, count: number) {
  const chartWidth = WIDTH - PAD_X * 2;
  return PAD_X + (count === 1 ? chartWidth / 2 : (index / (count - 1)) * chartWidth);
}

export function InteractiveTrendPlot({
  points,
  labels
}: {
  points: DashboardData["dailyTrend"];
  labels: { active: string; messages: string; hoverHint: string };
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeMax = Math.max(...points.map((point) => point.activeUsers), 1);
  const messageMax = Math.max(...points.map((point) => point.messages), 1);
  const chartWidth = WIDTH - PAD_X * 2;
  const chartHeight = HEIGHT - PAD_Y * 2;
  const barWidth = Math.max(1.25, Math.min(8, chartWidth / points.length - 1));
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
    ? PAD_Y + chartHeight - (activePoint.activeUsers / activeMax) * chartHeight
    : 0;
  const messageY = activePoint
    ? HEIGHT - PAD_Y - (activePoint.messages / messageMax) * chartHeight
    : 0;
  const tooltipX = Math.max(PAD_X + 4, Math.min(WIDTH - PAD_X - TOOLTIP_WIDTH - 4, x - TOOLTIP_WIDTH / 2));

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      tabIndex={0}
      aria-label={activePoint
        ? `${activePoint.date}，${labels.active} ${activePoint.activeUsers}，${labels.messages} ${activePoint.messages}`
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
        const height = (point.messages / messageMax) * chartHeight;
        return (
          <rect
            key={point.date}
            x={barX - barWidth / 2}
            y={HEIGHT - PAD_Y - height}
            width={barWidth}
            height={height}
            rx={barWidth / 2}
            className={styles.messageBar}
          />
        );
      })}
      <path d={pathFor(points.map((point) => point.activeUsers), activeMax)} className={styles.activePath} />

      {activePoint ? (
        <g className={styles.inspection} aria-hidden="true">
          <line x1={x} x2={x} y1={PAD_Y} y2={HEIGHT - PAD_Y} className={styles.inspectionLine} />
          <circle cx={x} cy={activeY} r="4" className={styles.activeMarker} />
          <circle cx={x} cy={messageY} r="3.5" className={styles.messageMarker} />
          <g transform={`translate(${tooltipX}, 8)`} className={styles.tooltip}>
            <rect width={TOOLTIP_WIDTH} height="62" rx="10" />
            <text x="12" y="19" className={styles.tooltipDate}>{activePoint.date}</text>
            <text x="12" y="43">{labels.active} <tspan>{activePoint.activeUsers}</tspan></text>
            <text x="96" y="43">{labels.messages} <tspan>{activePoint.messages}</tspan></text>
          </g>
        </g>
      ) : null}
      <rect x={PAD_X} y={PAD_Y} width={chartWidth} height={chartHeight} className={styles.pointerSurface} />
    </svg>
  );
}

"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { NewUserDailyTrendPoint } from "@/lib/dashboard-types";
import styles from "./NewUserTrendPlot.module.css";

const WIDTH = 920;
const HEIGHT = 322;
const PAD_X = 32;
const TOP_Y = 28;
const TOP_HEIGHT = 172;
const BOTTOM_Y = 232;
const BOTTOM_HEIGHT = 62;
const TOOLTIP_WIDTH = 226;

function pointX(index: number, count: number) {
  const width = WIDTH - PAD_X * 2;
  return PAD_X + (count === 1 ? width / 2 : (index / (count - 1)) * width);
}

function pathFor(values: number[], max: number) {
  return values.map((value, index) => {
    const x = pointX(index, values.length);
    const y = TOP_Y + TOP_HEIGHT - (value / Math.max(max, 1)) * TOP_HEIGHT;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function topY(value: number, max: number) {
  return TOP_Y + TOP_HEIGHT - (value / Math.max(max, 1)) * TOP_HEIGHT;
}

export function NewUserTrendPlot({
  points,
  labels
}: {
  points: NewUserDailyTrendPoint[];
  labels: {
    newUsers: string;
    messages: string;
    dailyEchoes: string;
    highlightImages: string;
    hoverHint: string;
  };
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const countMax = Math.max(
    ...points.map((point) => point.newUsers),
    ...points.map((point) => point.dailyEchoes),
    ...points.map((point) => point.highlightMomentImages),
    1
  );
  const messageMax = Math.max(...points.map((point) => point.messages.total), 1);
  const chartWidth = WIDTH - PAD_X * 2;
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
  const tooltipX = Math.max(PAD_X + 4, Math.min(WIDTH - PAD_X - TOOLTIP_WIDTH - 4, x - TOOLTIP_WIDTH / 2));

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      tabIndex={0}
      aria-label={activePoint
        ? `${activePoint.date}，${labels.newUsers} ${activePoint.newUsers}，${labels.messages} ${activePoint.messages.total}，${labels.dailyEchoes} ${activePoint.dailyEchoes}，${labels.highlightImages} ${activePoint.highlightMomentImages}`
        : labels.hoverHint}
      onPointerMove={updateFromPointer}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex((value) => value ?? points.length - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={moveWithKeyboard}
    >
      {[0, 0.5, 1].map((ratio) => (
        <line key={ratio} x1={PAD_X} x2={WIDTH - PAD_X} y1={TOP_Y + TOP_HEIGHT * ratio} y2={TOP_Y + TOP_HEIGHT * ratio} className={styles.gridLine} />
      ))}
      <line x1={PAD_X} x2={WIDTH - PAD_X} y1={BOTTOM_Y + BOTTOM_HEIGHT} y2={BOTTOM_Y + BOTTOM_HEIGHT} className={styles.gridLine} />
      <text x={PAD_X} y="14" className={styles.axisLabel}>人数 / 生成数</text>
      <text x={PAD_X} y={BOTTOM_Y - 9} className={styles.axisLabel}>D0 消息条数</text>

      {points.map((point, index) => {
        const height = (point.messages.total / messageMax) * BOTTOM_HEIGHT;
        return (
          <rect
            key={point.date}
            x={pointX(index, points.length) - barWidth / 2}
            y={BOTTOM_Y + BOTTOM_HEIGHT - height}
            width={barWidth}
            height={height}
            rx={barWidth / 2}
            className={styles.messageBar}
          />
        );
      })}
      <path d={pathFor(points.map((point) => point.newUsers), countMax)} className={styles.newUserPath} />
      <path d={pathFor(points.map((point) => point.dailyEchoes), countMax)} className={styles.echoPath} />
      <path d={pathFor(points.map((point) => point.highlightMomentImages), countMax)} className={styles.highlightPath} />

      {activePoint ? (
        <g className={styles.inspection} aria-hidden="true">
          <line x1={x} x2={x} y1={TOP_Y} y2={BOTTOM_Y + BOTTOM_HEIGHT} className={styles.inspectionLine} />
          <circle cx={x} cy={topY(activePoint.newUsers, countMax)} r="4" className={styles.newUserMarker} />
          <rect x={x - 3.5} y={topY(activePoint.dailyEchoes, countMax) - 3.5} width="7" height="7" className={styles.echoMarker} />
          <circle cx={x} cy={topY(activePoint.highlightMomentImages, countMax)} r="3.6" className={styles.highlightMarker} />
          <circle cx={x} cy={BOTTOM_Y + BOTTOM_HEIGHT - (activePoint.messages.total / messageMax) * BOTTOM_HEIGHT} r="3.6" className={styles.messageMarker} />
          <g transform={`translate(${tooltipX}, 6)`} className={styles.tooltip}>
            <rect width={TOOLTIP_WIDTH} height="88" rx="10" />
            <text x="12" y="19" className={styles.tooltipDate}>{activePoint.date}</text>
            <text x="12" y="40">{labels.newUsers} <tspan>{activePoint.newUsers}</tspan></text>
            <text x="118" y="40">{labels.messages} <tspan>{activePoint.messages.total}</tspan></text>
            <text x="12" y="61">{labels.dailyEchoes} <tspan>{activePoint.dailyEchoes}</tspan></text>
            <text x="118" y="61">{labels.highlightImages} <tspan>{activePoint.highlightMomentImages}</tspan></text>
          </g>
        </g>
      ) : null}
      <rect x={PAD_X} y={TOP_Y} width={chartWidth} height={BOTTOM_Y + BOTTOM_HEIGHT - TOP_Y} className={styles.pointerSurface} />
    </svg>
  );
}

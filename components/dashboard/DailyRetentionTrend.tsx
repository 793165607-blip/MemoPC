"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DailyRetentionPoint } from "@/lib/dashboard-types";
import styles from "./dashboard.module.css";

const WIDTH = 920;
const HEIGHT = 224;
const PAD_X = 44;
const PAD_TOP = 28;
const PAD_BOTTOM = 32;
const TOOLTIP_WIDTH = 210;

function pointX(index: number, count: number) {
  const span = WIDTH - PAD_X * 2;
  return PAD_X + (count === 1 ? span / 2 : (index / (count - 1)) * span);
}

function axisMax(points: DailyRetentionPoint[]) {
  const highest = Math.max(...points.map((point) => point.percentage), 0);
  return Math.max(10, Math.min(100, Math.ceil(highest / 10) * 10));
}

function pointY(value: number, maximum: number) {
  const span = HEIGHT - PAD_TOP - PAD_BOTTOM;
  return PAD_TOP + span - (value / maximum) * span;
}

function shortDate(value: string) {
  const date = new Date(`${value}T12:00:00+08:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function DailyRetentionTrend({ points }: { points: DailyRetentionPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const maximum = axisMax(points);
  const chartWidth = WIDTH - PAD_X * 2;
  const path = points.map((point, index) => (
    `${index === 0 ? "M" : "L"}${pointX(index, points.length).toFixed(1)},${pointY(point.percentage, maximum).toFixed(1)}`
  )).join(" ");

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
      const start = current ?? 0;
      return Math.max(0, Math.min(points.length - 1, start + (event.key === "ArrowLeft" ? -1 : 1)));
    });
  }

  const activeX = activeIndex === null ? 0 : pointX(activeIndex, points.length);
  const tooltipX = Math.max(PAD_X, Math.min(WIDTH - PAD_X - TOOLTIP_WIDTH, activeX - TOOLTIP_WIDTH / 2));
  const lastObservedDay = points.at(-1)?.day ?? 1;
  const ticks = [...new Set([1, 7, 14, 21, 30, lastObservedDay]
    .filter((day) => day <= lastObservedDay))].sort((a, b) => a - b);

  return (
    <svg
      className={styles.dailyRetentionChart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      tabIndex={0}
      aria-label={activePoint
        ? `D${activePoint.day}，${activePoint.date}，留存率 ${activePoint.percentage}%，${activePoint.numerator}/${activePoint.denominator} 人`
        : `D1 至 D${lastObservedDay} 每日留存趋势，悬停或使用左右方向键查看每天数据`}
      onPointerMove={updateFromPointer}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex((current) => current ?? 0)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={moveWithKeyboard}
    >
      {[0, maximum / 2, maximum].map((value) => (
        <g key={value} aria-hidden="true">
          <line x1={PAD_X} x2={WIDTH - PAD_X} y1={pointY(value, maximum)} y2={pointY(value, maximum)} className={styles.dailyRetentionGridLine} />
          <text x={PAD_X - 8} y={pointY(value, maximum) + 3} textAnchor="end" className={styles.dailyRetentionAxisLabel}>{value}%</text>
        </g>
      ))}
      <path d={path} className={styles.dailyRetentionTrendPath} />
      {points.map((point, index) => (
        <circle
          key={point.day}
          cx={pointX(index, points.length)}
          cy={pointY(point.percentage, maximum)}
          r={activeIndex === index ? 4.5 : 2.5}
          className={styles.dailyRetentionTrendPoint}
          aria-hidden="true"
        />
      ))}
      {ticks.map((day) => {
        const index = points.findIndex((point) => point.day === day);
        return (
          <text key={day} x={pointX(index, points.length)} y={HEIGHT - 8} textAnchor="middle" className={styles.dailyRetentionAxisLabel} aria-hidden="true">
            D{day}
          </text>
        );
      })}
      {activePoint ? (
        <g className={styles.dailyRetentionInspection} aria-hidden="true">
          <line x1={activeX} x2={activeX} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} />
          <g transform={`translate(${tooltipX}, 8)`} className={styles.dailyRetentionTooltip}>
            <rect width={TOOLTIP_WIDTH} height="58" rx="9" />
            <text x="12" y="19">D{activePoint.day} · {shortDate(activePoint.date)}</text>
            <text x="12" y="42">留存 <tspan>{activePoint.percentage.toFixed(1)}%</tspan></text>
            <text x="136" y="42"><tspan>{activePoint.numerator}/{activePoint.denominator}</tspan> 人</text>
          </g>
        </g>
      ) : null}
      <rect x={PAD_X} y={PAD_TOP} width={chartWidth} height={HEIGHT - PAD_TOP - PAD_BOTTOM} className={styles.dailyRetentionPointerSurface} />
    </svg>
  );
}

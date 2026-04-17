"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip);

type SpendChartsProps = {
  barLabels: string[];
  barValues: number[];
  donutLabels: string[];
  donutValues: number[];
  donutColors: string[];
};

export function SpendCharts({
  barLabels,
  barValues,
  donutLabels,
  donutValues,
  donutColors,
}: SpendChartsProps) {
  const barData = useMemo(
    () => ({
      labels: barLabels,
      datasets: [
        {
          label: "Spending",
          data: barValues,
          backgroundColor: barValues.map((_, i) =>
            i === barValues.length - 1
              ? "rgba(62,217,160,0.6)"
              : "rgba(62,217,160,0.15)",
          ),
          borderColor: barValues.map((_, i) =>
            i === barValues.length - 1
              ? "rgba(62,217,160,1)"
              : "rgba(62,217,160,0.3)",
          ),
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [barLabels, barValues],
  );

  const donutData = useMemo(
    () => ({
      labels: donutLabels,
      datasets: [
        {
          data: donutValues,
          backgroundColor: donutColors.map((c) => `${c}cc`),
          borderColor: donutColors,
          borderWidth: 1.5,
          hoverOffset: 6,
        },
      ],
    }),
    [donutLabels, donutValues, donutColors],
  );

  const chartOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#6b7a72", font: { size: 12 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#6b7a72",
            font: { size: 12 },
            callback: (v: string | number) =>
              "₱" + Number(v).toLocaleString("en-PH"),
          },
        },
      },
    }),
    [],
  );

  const donutOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: { legend: { display: false } },
    }),
    [],
  );

  return (
    <div className="mb-7 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="card">
        <div className="card-title">
          Monthly spending trend
          <span className="badge">Last 6 months</span>
        </div>
        <div className="relative h-[200px]">
          <Bar data={barData} options={chartOpts} />
        </div>
      </div>
      <div className="card">
        <div className="card-title">Spending split</div>
        <div className="relative h-[200px]">
          {donutValues.some((v) => v > 0) ? (
            <Doughnut data={donutData} options={donutOpts} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[color:var(--muted)]">
              No spending this month
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

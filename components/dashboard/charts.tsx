"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface BarChartTurnosProps {
  data: Array<{ dia: string; vip: number; regular: number }>;
}

export function BarChartTurnos({ data }: BarChartTurnosProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11, fill: "#64748B" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
          }}
        />
        <Bar dataKey="vip" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
        <Bar dataKey="regular" stackId="a" fill="#0F172A" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DonutChartCanalesProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function DonutChartCanales({ data }: DonutChartCanalesProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value}%`, ""]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

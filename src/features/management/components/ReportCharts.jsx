import { useId, useState } from "react";
import { Empty, Segmented, Tooltip } from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  PieChartOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import { money } from "../../../shared/utils/format";
import { orderBreakdown } from "../utils/dashboard";

const compact = (value) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export default function ReportCharts({ rows, orders }) {
  const [metric, setMetric] = useState("revenue");
  const gradientId = useId();
  const values = rows.map((row) => Number(row[metric]) || 0);
  const maximum =
    Math.ceil(
      (Math.max(...values, 0) || (metric === "revenue" ? 1000000 : 4)) / 4,
    ) * 4;
  const points = rows.map((row, index) => ({
    ...row,
    x: rows.length === 1 ? 400 : 64 + (index / (rows.length - 1)) * 672,
    y: 232 - (values[index] / maximum) * 190,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const total = values.reduce((sum, value) => sum + value, 0);
  const statuses = orderBreakdown(orders);
  const segments = statuses
    .map((item, index) => {
      const start = statuses
        .slice(0, index)
        .reduce((sum, status) => sum + status.percentage, 0);
      return `${item.color} ${start}% ${start + item.percentage}%`;
    })
    .join(", ");
  const caption = metric === "revenue" ? "Doanh thu theo kỳ" : "Số đơn theo kỳ";
  return (
    <div className="mg-report-charts">
      <section
        className="mg-chart-card"
        aria-label="Biểu đồ xu hướng kinh doanh"
      >
        <div className="mg-chart-heading">
          <h2>
            <LineChartOutlined /> {caption}
          </h2>
          <Segmented
            aria-label="Chỉ số biểu đồ"
            value={metric}
            onChange={setMetric}
            options={[
              {
                value: "revenue",
                label: "Doanh thu",
                icon: <DollarOutlined />,
              },
              { value: "orders", label: "Số đơn", icon: <ShoppingOutlined /> },
            ]}
          />
        </div>
        <div className="mg-chart-summary">
          <strong>
            {metric === "revenue"
              ? money(total)
              : total.toLocaleString("vi-VN")}
          </strong>
          <span>
            {metric === "revenue"
              ? "Tổng từ các đơn đã hoàn thành"
              : "Tổng đơn được tạo trong kỳ"}
          </span>
        </div>
        {points.length ? (
          <>
            <div className="mg-trend-scroll">
              <svg
                className="mg-trend-chart"
                viewBox="0 0 760 280"
                role="img"
                aria-label={`${caption}: ${metric === "revenue" ? money(total) : total + " đơn"}`}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#79ac61" stopOpacity="0.35" />
                    <stop
                      offset="100%"
                      stopColor="#79ac61"
                      stopOpacity="0.02"
                    />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((tick) => {
                  const y = 232 - (tick / 4) * 190;
                  return (
                    <g key={tick}>
                      <line
                        x1="64"
                        x2="736"
                        y1={y}
                        y2={y}
                        stroke="#e7ece4"
                        strokeDasharray="4 5"
                      />
                      <text x="52" y={y + 4} textAnchor="end">
                        {metric === "revenue"
                          ? compact((maximum * tick) / 4)
                          : (maximum * tick) / 4}
                      </text>
                    </g>
                  );
                })}
                <polygon
                  points={`${points[0].x},232 ${line} ${points.at(-1).x},232`}
                  fill={`url(#${gradientId})`}
                />
                <polyline
                  points={line}
                  fill="none"
                  stroke="#468432"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((point, index) => (
                  <g key={point.id}>
                    <Tooltip
                      title={`${point.label}: ${metric === "revenue" ? money(values[index]) : values[index] + " đơn"}`}
                    >
                      <g
                        className="mg-trend-point"
                        tabIndex={0}
                        aria-label={`${point.label}: ${metric === "revenue" ? money(values[index]) : values[index] + " đơn"}`}
                      >
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="12"
                          fill="transparent"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="4.5"
                          fill="#fff"
                          stroke="#468432"
                          strokeWidth="2.5"
                        />
                      </g>
                    </Tooltip>
                    <text x={point.x} y="260" textAnchor="middle">
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <table className="mg-sr-only">
              <caption>{caption}</caption>
              <thead>
                <tr>
                  <th>Kỳ</th>
                  <th>{metric === "revenue" ? "Doanh thu (VNĐ)" : "Số đơn"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <th>{row.label}</th>
                    <td>{values[index]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total === 0 && (
              <p className="mg-chart-note">
                {metric === "revenue"
                  ? "Chưa có doanh thu từ đơn hoàn thành trong kỳ này."
                  : "Chưa có đơn hàng trong kỳ này."}
              </p>
            )}
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có dữ liệu trong kỳ"
          />
        )}
      </section>
      <section className="mg-chart-card" aria-label="Biểu đồ trạng thái đơn">
        <h2>
          <PieChartOutlined /> Cơ cấu đơn hàng
        </h2>
        <p className="mg-chart-note">Phân bổ theo trạng thái hiện tại</p>
        {statuses.length ? (
          <div className="mg-order-breakdown">
            <div
              className="mg-status-donut"
              role="img"
              aria-label={statuses
                .map((item) => `${item.status}: ${item.count}`)
                .join(", ")}
              style={{ background: `conic-gradient(${segments})` }}
            >
              <div>
                <strong>{orders.length}</strong>
                <span>đơn hàng</span>
              </div>
            </div>
            <ul className="mg-status-legend">
              {statuses.map((item) => (
                <li key={item.status}>
                  <span
                    className="mg-status-dot"
                    style={{ background: item.color }}
                  />
                  <span>{item.status}</span>
                  <strong>{item.count}</strong>
                  <small>
                    {item.percentage.toLocaleString("vi-VN", {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </small>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có đơn hàng trong kỳ"
          />
        )}
      </section>
    </div>
  );
}

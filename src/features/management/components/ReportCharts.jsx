import { Empty, Tooltip } from "antd";
import { money } from "../../../shared/utils/format";

export default function ReportCharts({ rows, orders }) {
  const maximum = Math.max(...rows.map((r) => r.revenue), 1);
  const statuses = [...new Set(orders.map((o) => o.status))].map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));
  return (
    <div className="mg-report-charts">
      <section className="mg-chart-card" aria-label="Biểu đồ doanh thu">
        <h2>Doanh thu theo kỳ</h2>
        <p>Đơn vị: VNĐ</p>
        {rows.some((r) => r.revenue > 0) ? (
          <div
            className="mg-bar-chart"
            role="group"
            aria-label="Doanh thu từng kỳ"
          >
            {rows.map((r) => (
              <div key={r.id} className="mg-bar-column">
                <Tooltip title={`${r.label}: ${money(r.revenue)}`}>
                  <button
                    className="mg-chart-bar"
                    style={{
                      height: `${Math.max((r.revenue / maximum) * 100, 1)}%`,
                    }}
                    aria-label={`${r.label}: ${money(r.revenue)}`}
                  >
                    <span className="mg-bar-value">
                      {new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(r.revenue)}
                    </span>
                  </button>
                </Tooltip>
                <span className="mg-bar-label">{r.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có doanh thu trong kỳ"
          />
        )}
      </section>
      <section className="mg-chart-card" aria-label="Biểu đồ trạng thái đơn">
        <h2>Đơn hàng theo trạng thái</h2>
        {statuses.length ? (
          <div className="mg-horizontal-chart">
            {statuses.map(({ status, count }, i) => (
              <div key={status}>
                <div className="mg-chart-caption">
                  <span>{status}</span>
                  <strong>{count}</strong>
                </div>
                <div className="mg-chart-track">
                  <div
                    style={{
                      width: `${(count / orders.length) * 100}%`,
                      background: ["#468432", "#93bc82", "#6ca256", "#356626"][
                        i % 4
                      ],
                    }}
                  />
                </div>
              </div>
            ))}
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

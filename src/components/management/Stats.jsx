import { Card, Statistic, Tooltip } from "antd";
import { money } from "../../utils/format";
import { todayRevenue } from "../../utils/management";
export default function Stats({ orders, products, showToday = false }) {
  const completed = orders.filter((o) => o.status === "Đã hoàn thành");
  return (
    <div className={`mg-stats ${showToday ? "mg-stats-today" : ""}`}>
      {showToday && (
        <Card>
          <Statistic
            title="Doanh thu hôm nay"
            value={todayRevenue(orders)}
            formatter={money}
          />
        </Card>
      )}
      <Card>
        <Statistic
          title="Doanh thu tổng"
          value={completed.reduce((sum, o) => sum + o.total, 0)}
          formatter={money}
        />
      </Card>
      <Card>
        <Statistic title="Tổng đơn hàng" value={orders.length} />
      </Card>
      <Card>
        <Statistic
          title="Chờ xác nhận"
          value={orders.filter((o) => o.status === "Chờ xác nhận").length}
        />
      </Card>
      <Card>
        <Statistic
          title={
            <Tooltip title="Số biến thể có tồn kho từ 0 đến 5">
              <span tabIndex={0}>Sắp hết hàng</span>
            </Tooltip>
          }
          value={
            products.flatMap((p) => p.variants).filter((v) => v.stock <= 5)
              .length
          }
        />
      </Card>
    </div>
  );
}

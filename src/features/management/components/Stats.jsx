import { Card, Statistic, Tooltip } from "antd";
import { money } from "../../../shared/utils/format";
import { todayRevenue, isLowStock } from "../utils/management";
import { useManagement } from "../hooks/useManagement";
import {
  CalendarOutlined,
  DollarOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
export default function Stats({ orders, products, showToday = false }) {
  const { lowStockLimit } = useManagement();
  const completed = orders.filter((o) => o.status === "Đã hoàn thành");
  return (
    <div className={`mg-stats ${showToday ? "mg-stats-today" : ""}`}>
      {showToday && (
        <Card>
          <Statistic
            title={
              <span className="mg-stat-label">
                <CalendarOutlined /> Doanh thu hôm nay
              </span>
            }
            value={todayRevenue(orders)}
            formatter={money}
          />
        </Card>
      )}
      <Card>
        <Statistic
          title={
            <span className="mg-stat-label">
              <DollarOutlined /> Doanh thu tổng
            </span>
          }
          value={completed.reduce((sum, o) => sum + o.total, 0)}
          formatter={money}
        />
      </Card>
      <Card>
        <Statistic
          title={
            <span className="mg-stat-label">
              <ShoppingOutlined /> Tổng đơn hàng
            </span>
          }
          value={orders.length}
        />
      </Card>
      <Card>
        <Statistic
          title={
            <span className="mg-stat-label">
              <ClockCircleOutlined /> Chờ xác nhận
            </span>
          }
          value={orders.filter((o) => o.status === "Chờ xác nhận").length}
        />
      </Card>
      <Card>
        <Statistic
          title={
            <Tooltip
              title={`Số biến thể còn từ 1 đến ${lowStockLimit} sản phẩm; không tính biến thể hết hàng`}
            >
              <span className="mg-stat-label" tabIndex={0}>
                <InboxOutlined /> Sắp hết hàng
              </span>
            </Tooltip>
          }
          value={
            products
              .flatMap((p) => p.variants)
              .filter((v) => isLowStock(v.stock, lowStockLimit)).length
          }
        />
      </Card>
    </div>
  );
}

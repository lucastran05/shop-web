import { Card, Statistic } from "antd";
import { money } from "../../utils/format";
export default function Stats({ orders, products }) {
  const completed = orders.filter((o) => o.status === "Đã hoàn thành");
  return (
    <div className="mg-stats">
      <Card>
        <Statistic
          title="Doanh thu đơn hoàn thành"
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
          title="Biến thể sắp hết hàng (≤ 5)"
          value={
            products.flatMap((p) => p.variants).filter((v) => v.stock <= 5)
              .length
          }
        />
      </Card>
    </div>
  );
}

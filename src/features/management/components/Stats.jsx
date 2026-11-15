import { Tooltip } from "antd";
import { Link } from "react-router-dom";
import { money } from "../../../shared/utils/format";
import { todayOrders, todayRevenue, isLowStock } from "../utils/management";
import { useManagement } from "../hooks/useManagement";

// Dải số liệu chính của cửa hàng: một băng ngang chia cột, số lớn kiểu serif
export default function Stats({ orders, products, showToday = false }) {
  const { lowStockLimit } = useManagement();
  const completed = orders.filter((o) => o.status === "Đã hoàn thành");
  const waiting = orders.filter((o) => o.status === "Chờ xác nhận").length;
  const lowStock = products
    .flatMap((p) => p.variants)
    .filter((v) => isLowStock(v.stock, lowStockLimit)).length;
  return (
    <section
      className={`mg-ledger ${showToday ? "mg-ledger-today" : ""}`}
      aria-label="Số liệu chính"
    >
      {showToday && (
        <Tooltip title="Tổng tiền các đơn đặt trong hôm nay (giờ Việt Nam), không tính đơn đã hủy, hoàn hàng hoặc hoàn tiền">
          <div className="mg-ledger-cell is-lead" tabIndex={0}>
            <span>Doanh thu hôm nay</span>
            <strong>{money(todayRevenue(orders))}</strong>
            <small>{todayOrders(orders).length} đơn đặt hôm nay</small>
          </div>
        </Tooltip>
      )}
      <div className="mg-ledger-cell">
        <span>Doanh thu tổng</span>
        <strong>{money(completed.reduce((sum, o) => sum + o.total, 0))}</strong>
      </div>
      <div className="mg-ledger-cell">
        <span>Tổng đơn hàng</span>
        <strong>{orders.length}</strong>
      </div>
      <Link
        className={"mg-ledger-cell" + (waiting ? " is-alert" : "")}
        to="/management/orders"
      >
        <span>Chờ xác nhận</span>
        <strong>{waiting}</strong>
      </Link>
      <Tooltip
        title={`Số biến thể còn từ 1 đến ${lowStockLimit} sản phẩm; không tính biến thể hết hàng`}
      >
        <Link
          className={"mg-ledger-cell" + (lowStock ? " is-alert" : "")}
          to="/management/inventory"
        >
          <span>Sắp hết hàng</span>
          <strong>{lowStock}</strong>
        </Link>
      </Tooltip>
    </section>
  );
}

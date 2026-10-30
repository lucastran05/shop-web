import Button from "../components/ManagementButton";
import { Link } from "react-router-dom";
import { Space, Table } from "antd";
import { useManagement } from "../hooks/useManagement";
import { orderColumns } from "../components/orderColumns";

import Stats from "../components/Stats";
import ReportCharts from "../components/ReportCharts";
export default function DashboardPage() {
  const s = useManagement();
  const year = new Date().getFullYear();
  const orders = s.orders.filter(
    (order) => new Date(order.createdAt).getFullYear() === year,
  );
  const rows = Array.from({ length: 12 }, (_, month) => ({
    id: month,
    label: `T${month + 1}`,
    revenue: orders
      .filter(
        (order) =>
          order.status === "Đã hoàn thành" &&
          new Date(order.createdAt).getMonth() === month,
      )
      .reduce((sum, order) => sum + order.total, 0),
  }));
  return (
    <>
      <Stats orders={s.orders} products={s.products} showToday />
      <p className="mg-period-caption">Hoạt động kinh doanh năm {year}</p>
      <ReportCharts rows={rows} orders={orders} />
      <div className="mg-section">
        <Space className="mg-toolbar">
          <h2>Đơn hàng gần đây</h2>
          <Link to="/management/orders">
            <Button>Quản lý đơn hàng</Button>
          </Link>
        </Space>
        <Table
          rowKey="id"
          columns={orderColumns}
          scroll={{ x: 700 }}
          dataSource={[...s.orders]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 6)}
          pagination={false}
        />
      </div>
    </>
  );
}

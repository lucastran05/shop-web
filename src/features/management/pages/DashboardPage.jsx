import Button from "../components/ManagementButton";
import { Link } from "react-router-dom";
import { Progress, Space, Table } from "antd";
import { useManagement } from "../hooks/useManagement";
import { orderColumns } from "../components/orderColumns";

import Stats from "../components/Stats";
export default function DashboardPage() {
  const s = useManagement();
  return (
    <>
      <Stats orders={s.orders} products={s.products} showToday />
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
      <div className="mg-section">
        <h2>Tình trạng đơn hàng</h2>
        <div className="mg-status-grid">
          {[
            "Chờ xác nhận",
            "Đang chuẩn bị hàng",
            "Đang giao hàng",
            "Đã hoàn thành",
          ].map((status) => {
            const count = s.orders.filter((o) => o.status === status).length;
            return (
              <div key={status}>
                <span>
                  {status} ({count})
                </span>
                <Progress
                  percent={
                    s.orders.length
                      ? Math.round((count / s.orders.length) * 100)
                      : 0
                  }
                  strokeColor="#1677ff"
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

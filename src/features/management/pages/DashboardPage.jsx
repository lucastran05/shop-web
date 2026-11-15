import Button from "../components/ManagementButton";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Select, Space, Table, Empty, Progress } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { useManagement } from "../hooks/useManagement";
import { orderColumns } from "../components/orderColumns";

import Stats from "../components/Stats";
import ReportCharts from "../components/ReportCharts";
import { buildDashboardData, orderPeriod } from "../utils/dashboard";
export default function DashboardPage() {
  const s = useManagement();
  const currentYear = orderPeriod(new Date()).year;
  const [year, setYear] = useState(currentYear);
  const years = [
    ...new Set([
      currentYear,
      ...s.orders
        .map((order) => orderPeriod(order.createdAt)?.year)
        .filter(Boolean),
    ]),
  ].sort((a, b) => b - a);
  const { rows, orders, topProducts } = buildDashboardData(s.orders, year);
  return (
    <>
      <Stats orders={s.orders} products={s.products} showToday />
      <div className="mg-dashboard-period">
        <div>
          <h2>Phân tích kinh doanh</h2>
          <p>Thống kê theo ngày tạo đơn · Giờ Việt Nam</p>
        </div>
        <Select
          aria-label="Năm thống kê"
          value={year}
          onChange={setYear}
          options={years.map((value) => ({ value, label: `Năm ${value}` }))}
        />
      </div>
      <ReportCharts rows={rows} orders={orders} />
      <section
        className="mg-chart-card mg-top-products"
        aria-label="Sản phẩm bán chạy"
      >
        <div className="mg-chart-heading">
          <div>
            <h2>Sản phẩm bán chạy</h2>
            <p>Top 5 theo số lượng trong đơn hoàn thành · Năm {year}</p>
          </div>
        </div>
        {topProducts.length ? (
          <div className="mg-top-product-list">
            {topProducts.map((product, index) => (
              <div className="mg-top-product" key={product.id}>
                <span className="mg-top-rank">{index + 1}</span>
                <img src={product.image || "/product-placeholder.svg"} alt="" />
                <div className="mg-top-product-info">
                  <strong>{product.name}</strong>
                  <Progress
                    percent={Math.round(
                      (product.quantity / topProducts[0].quantity) * 100,
                    )}
                    showInfo={false}
                    size="small"
                    strokeColor="#3c6a2c"
                  />
                </div>
                <span className="mg-top-quantity">
                  <strong>{product.quantity}</strong> đã bán
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có sản phẩm bán ra từ đơn hoàn thành trong năm này"
          />
        )}
      </section>
      <div className="mg-section">
        <Space className="mg-toolbar">
          <h2>Đơn hàng gần đây</h2>
          <Link to="/management/orders">
            <Button icon={<ArrowRightOutlined />}>Quản lý đơn hàng</Button>
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

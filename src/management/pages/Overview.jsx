import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
} from "antd";
import { useManagement } from "../context";
import { PageTitle } from "../PageTitle";
import { orderColumns } from "../orderColumns";
import { money } from "../../utils/format";

function Stats({ orders, products }) {
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
export function DashboardPage() {
  const s = useManagement();
  return (
    <>
      <PageTitle
        title="Tổng quan"
        description="Theo dõi nhanh tình hình cửa hàng."
      />
      <Stats orders={s.orders} products={s.products} />
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
export function ReportsPage() {
  const s = useManagement(),
    [year, setYear] = useState(new Date().getFullYear()),
    [period, setPeriod] = useState("month");
  const orders = s.orders.filter(
    (o) => new Date(o.createdAt).getFullYear() === year,
  );
  const count = period === "month" ? 12 : period === "quarter" ? 4 : 1;
  const rows = Array.from({ length: count }, (_, i) => {
    const items = orders.filter(
      (o) => Math.floor(new Date(o.createdAt).getMonth() / (12 / count)) === i,
    );
    const completed = items.filter((o) => o.status === "Đã hoàn thành");
    return {
      id: i,
      label:
        period === "month"
          ? `Tháng ${i + 1}`
          : period === "quarter"
            ? `Quý ${i + 1}`
            : `Năm ${year}`,
      orders: items.length,
      completed: completed.length,
      revenue: completed.reduce((n, o) => n + o.total, 0),
      received: items.reduce((n, o) => n + (o.paid || 0), 0),
      refunded: items.reduce((n, o) => n + (o.refunded || 0), 0),
    };
  });
  function download() {
    const csv =
      "\uFEFF" +
      [
        "Kỳ,Số đơn,Hoàn thành,Doanh thu,Đang giữ,Đã hoàn",
        ...rows.map(
          (r) =>
            `${r.label},${r.orders},${r.completed},${r.revenue},${r.received},${r.refunded}`,
        ),
      ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-${year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageTitle
        title="Báo cáo kinh doanh"
        description="Doanh thu tính theo đơn đã hoàn thành, nhóm theo ngày đặt đơn."
      />
      <div className="mg-toolbar">
        <Input
          type="number"
          aria-label="Năm báo cáo"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <Select
          aria-label="Kỳ báo cáo"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "month", label: "Theo tháng" },
            { value: "quarter", label: "Theo quý" },
            { value: "year", label: "Theo năm" },
          ]}
        />
        <Button onClick={download}>Xuất CSV</Button>
      </div>
      <Stats orders={orders} products={s.products} />
      <Table
        className="mg-section"
        rowKey="id"
        dataSource={rows}
        pagination={false}
        scroll={{ x: 700 }}
        columns={[
          { title: "Kỳ", dataIndex: "label" },
          { title: "Số đơn", dataIndex: "orders" },
          { title: "Hoàn thành", dataIndex: "completed" },
          { title: "Doanh thu", dataIndex: "revenue", render: money },
          {
            title: "Tiền đã thu đang giữ",
            dataIndex: "received",
            render: money,
          },
          { title: "Đã hoàn tiền", dataIndex: "refunded", render: money },
        ]}
      />
    </>
  );
}

import Button from "../components/ManagementButton";
import { useState } from "react";
import { DownloadOutlined } from "@ant-design/icons";
import ReportCharts from "../components/ReportCharts";

import { InputNumber, Select, Table } from "antd";
import { useManagement } from "../hooks/useManagement";

import { money } from "../../../shared/utils/format";

import Stats from "../components/Stats";
export default function ReportsPage() {
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
      <div className="mg-toolbar">
        <InputNumber
          aria-label="Năm báo cáo"
          min={2000}
          max={2100}
          value={year}
          onChange={(val) => val && setYear(val)}
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
        <Button icon={<DownloadOutlined />} onClick={download}>
          Xuất CSV
        </Button>
      </div>
      <Stats orders={orders} products={s.products} />
      <ReportCharts rows={rows} orders={orders} />
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

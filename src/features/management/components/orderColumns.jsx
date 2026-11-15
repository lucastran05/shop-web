import CopyCode from "../../../shared/components/CopyCode";
import { statusColors } from "../constants/management";
import { money } from "../../../shared/utils/format";
export const statusTag = (status) => (
  <span
    className="mg-status"
    style={{ "--tone": statusColors[status] || "#56604f" }}
  >
    {status}
  </span>
);
export const orderColumns = [
  {
    title: "Mã đơn",
    dataIndex: "code",
    width: 160,
    render: (value) => (
      <span className="mg-order-code">
        <span title={value}>
          {value?.length > 8
            ? `${value.slice(0, 4)}…${value.slice(-4)}`
            : value}
        </span>
        <CopyCode value={value} />
      </span>
    ),
  },
  { title: "Khách hàng", render: (_, o) => o.recipient?.name || o.owner },
  {
    title: "Ngày đặt",
    dataIndex: "createdAt",
    render: (d) => new Date(d).toLocaleDateString("vi-VN"),
  },
  { title: "Tổng tiền", dataIndex: "total", render: money },
  { title: "Trạng thái", dataIndex: "status", render: statusTag },
];

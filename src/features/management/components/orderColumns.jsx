import CopyCode from "../../../shared/components/CopyCode";
import { Tag } from "antd";
import { statusColors } from "../constants/management";
import { money } from "../../../shared/utils/format";
export const statusTag = (status) => (
  <Tag color={statusColors[status]}>{status}</Tag>
);
export const orderColumns = [
  {
    title: "Mã đơn",
    dataIndex: "code",
    render: (value) => <CopyCode value={value} />,
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

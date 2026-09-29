import {
  CheckCircleOutlined,
  WalletOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { orderColumns } from "../../components/management/orderColumns";
import { useState } from "react";
import { App, Button, Input, Modal, Space, Table, Tooltip } from "antd";
import { useManagement } from "../../hooks/useManagement";
import { PageTitle } from "../../components/management/PageTitle";

import { money } from "../../utils/format";

export default function PaymentsPage() {
  const s = useManagement(),
    { message } = App.useApp();
  const [action, setAction] = useState(null),
    [query, setQuery] = useState("");
  function confirm() {
    const order = s.orders.find((o) => o.id === action.id);
    if (!order) return;
    if (action.type === "refund") {
      if (!["Đã hủy", "Hoàn hàng"].includes(order.status) || !order.paid)
        return message.error("Đơn hàng không đủ điều kiện hoàn tiền.");
      s.updateOrder({
        ...order,
        status: "Hoàn tiền",
        refunded: order.paid,
        paid: 0,
        remaining: 0,
        paymentStatus: "Đã hoàn tiền",
        history: [
          ...(order.history || []),
          {
            at: new Date().toISOString(),
            text: `Hoàn tiền ${money(order.paid)}`,
          },
        ],
      });
    } else {
      if (["Đã hủy", "Hoàn hàng", "Hoàn tiền"].includes(order.status))
        return message.error("Không thể xác nhận thanh toán cho đơn này.");
      const paid =
        action.type === "deposit"
          ? Math.max(order.paid || 0, order.deposit || 0)
          : order.total;
      s.updateOrder({
        ...order,
        paid,
        remaining: order.total - paid,
        depositStatus: order.deposit ? "Đã xác nhận" : "Không đặt cọc",
        paymentStatus: paid === order.total ? "Đã thanh toán" : "Đã cọc",
        history: [
          ...(order.history || []),
          {
            at: new Date().toISOString(),
            text: `Xác nhận đã trả ${money(paid)}`,
          },
        ],
      });
    }
    setAction(null);
    message.success("Đã lưu xác nhận");
  }
  return (
    <>
      <PageTitle
        title="Thanh toán & hoàn tiền"
        description="Đối soát tiền cọc, thanh toán và hoàn tiền."
      />
      <div className="mg-toolbar">
        <Input.Search
          allowClear
          placeholder="Tìm mã đơn hoặc khách hàng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Table
        rowKey="id"
        rowSelection={{}}
        scroll={{ x: 1050 }}
        dataSource={s.orders.filter((o) =>
          `${o.id} ${o.recipient?.name}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )}
        columns={[
          ...orderColumns.filter((c) => c.dataIndex !== "createdAt"),
          { title: "Đã trả", dataIndex: "paid", render: (n) => money(n || 0) },
          {
            title: "Đã hoàn",
            dataIndex: "refunded",
            render: (n) => money(n || 0),
          },
          {
            title: "Thao tác",
            width: 152,
            align: "center",
            className: "mg-action-cell",
            render: (_, o) => (
              <Space size={8}>
                <Tooltip title="Xác nhận cọc">
                  <span>
                    <Button
                      className="mg-icon-action"
                      aria-label={`Xác nhận cọc ${o.id}`}
                      icon={<WalletOutlined aria-hidden="true" />}
                      disabled={
                        ["Đã hủy", "Hoàn hàng", "Hoàn tiền"].includes(
                          o.status,
                        ) ||
                        !o.deposit ||
                        o.paid >= o.deposit
                      }
                      onClick={() => setAction({ id: o.id, type: "deposit" })}
                    />
                  </span>
                </Tooltip>
                <Tooltip title="Xác nhận thanh toán đủ">
                  <span>
                    <Button
                      className="mg-icon-action"
                      aria-label={`Xác nhận thanh toán đủ ${o.id}`}
                      icon={<CheckCircleOutlined aria-hidden="true" />}
                      disabled={
                        ["Đã hủy", "Hoàn hàng", "Hoàn tiền"].includes(
                          o.status,
                        ) || o.paid >= o.total
                      }
                      onClick={() => setAction({ id: o.id, type: "full" })}
                    />
                  </span>
                </Tooltip>
                <Tooltip title="Hoàn tiền">
                  <span>
                    <Button
                      className="mg-icon-action"
                      aria-label={`Hoàn tiền ${o.id}`}
                      icon={<UndoOutlined aria-hidden="true" />}
                      danger
                      disabled={
                        !["Đã hủy", "Hoàn hàng"].includes(o.status) || !o.paid
                      }
                      onClick={() => setAction({ id: o.id, type: "refund" })}
                    />
                  </span>
                </Tooltip>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={
          action?.type === "refund"
            ? "Xác nhận hoàn tiền"
            : "Xác nhận thanh toán"
        }
        open={!!action}
        onCancel={() => setAction(null)}
        onOk={confirm}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>
          Đơn hàng: <strong>{action?.id}</strong>
        </p>
        <p>
          {action?.type === "refund"
            ? "Bạn xác nhận đã hoàn tiền cho khách hàng?"
            : "Bạn xác nhận đã nhận tiền thanh toán cho đơn hàng này?"}
        </p>
      </Modal>
    </>
  );
}

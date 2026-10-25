import BulkSelectAll from "../../components/management/BulkSelectAll";
import {
  CheckCircleOutlined,
  WalletOutlined,
  UndoOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { statusTag } from "../../components/management/orderColumns";
import { useState } from "react";
import { App, Button, Input, Modal, Space, Table, Tooltip } from "antd";
import { useManagement } from "../../hooks/useManagement";

import { money } from "../../utils/format";
import BulkActions from "../../components/management/BulkActions";
import { api } from "../../services/api";
import { userError } from "../../utils/userError";

export default function PaymentsPage() {
  const s = useManagement(),
    { message } = App.useApp();
  const [action, setAction] = useState(null),
    [selected, setSelected] = useState([]),
    [note, setNote] = useState(""),
    [query, setQuery] = useState("");
  const rows = s.orders.filter(
    (o) =>
      !s.hiddenPayments.includes(o.id) &&
      `${o.id} ${o.recipient?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function confirm() {
    const order = s.orders.find((o) => o.id === action.id);
    if (!order) return;
    try {
      if (action.type === "note") {
        await s.updateOrder({ ...order, note: note.trim() });
        setAction(null);
        message.success("Đã lưu ghi chú thanh toán");
        return;
      }
      if (action.type === "refund") {
        if (
          !["Đã hủy", "Hoàn hàng"].includes(order.status) ||
          !order.paid ||
          (order.refunded || 0) >= order.paid ||
          order.paymentStatus === "refunded"
        )
          return message.error("Đơn hàng không đủ điều kiện hoàn tiền.");
        await api.adminPayments.refund(
          order.id,
          {
            amount: order.paid - (order.refunded || 0),
            reason: note.trim() || "Hoàn tiền đơn hàng",
            transaction_reference: crypto.randomUUID(),
          },
          { idempotencyKey: crypto.randomUUID() },
        );
      } else {
        if (["Đã hủy", "Hoàn hàng", "Hoàn tiền"].includes(order.status))
          return message.error("Không thể xác nhận thanh toán cho đơn này.");
        const paid =
          action.type === "deposit"
            ? Math.max(order.paid || 0, order.deposit || 0)
            : order.total;
        const amount = paid - (order.paid || 0);
        if (amount <= 0) return;
        await api.adminPayments.confirm(
          order.id,
          {
            kind: action.type === "deposit" ? "deposit" : "full",
            amount,
            note: note.trim(),
            transaction_reference: crypto.randomUUID(),
          },
          { idempotencyKey: crypto.randomUUID() },
        );
      }
      await s.loadOrders();
      setAction(null);
      message.success("Đã lưu xác nhận");
    } catch (error) {
      message.error(userError(error));
    }
  }
  return (
    <>
      <div className="mg-toolbar">
        <Input.Search
          allowClear
          placeholder="Tìm mã đơn hoặc khách hàng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!!s.hiddenPayments.length && (
          <Button onClick={() => s.setHiddenPayments([])}>
            Khôi phục danh sách thanh toán
          </Button>
        )}
        <BulkActions
          keys={rows.map((o) => o.id)}
          selected={selected}
          onSelect={setSelected}
          onDelete={(ids) =>
            s.setHiddenPayments((old) => [...new Set([...old, ...ids])])
          }
          description="Chỉ xóa khỏi danh sách thanh toán; giữ nguyên đơn hàng, số tiền và doanh thu. Có thể khôi phục danh sách."
        />
      </div>
      <Table
        rowKey="id"
        tableLayout="fixed"
        rowSelection={{
          selectedRowKeys: selected,
          onChange: setSelected,
          columnTitle: (
            <BulkSelectAll
              keys={rows.map((o) => o.id)}
              selected={selected}
              onSelect={setSelected}
            />
          ),
        }}
        scroll={{ x: 1230 }}
        dataSource={rows}
        columns={[
          { title: "Mã đơn", dataIndex: "id", width: 100 },
          {
            title: "Khách hàng",
            render: (_, o) => o.recipient?.name || o.owner,
            width: 170,
          },
          {
            title: "Tổng tiền",
            dataIndex: "total",
            render: money,
            width: 130,
            align: "right",
          },
          {
            title: "Trạng thái",
            render: (_, o) =>
              statusTag(o.paymentStatus === "refunded" ? "Hoàn tiền" : o.status),
            width: 150,
          },
          {
            title: "Đã trả",
            dataIndex: "paid",
            render: (n) => money(n || 0),
            width: 130,
            align: "right",
          },
          {
            title: "Đã hoàn",
            dataIndex: "refunded",
            render: (n) => money(n || 0),
            width: 130,
            align: "right",
          },
          {
            title: "Ghi chú",
            dataIndex: "paymentNote",
            width: 230,
            render: (value) => (
              <span
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {value || "—"}
              </span>
            ),
          },
          {
            title: "Thao tác",
            width: 190,
            align: "center",
            className: "mg-action-cell",
            render: (_, o) => (
              <Space size={8}>
                <Tooltip title="Ghi chú thanh toán">
                  <Button
                    className="mg-icon-action"
                    aria-label={`Ghi chú ${o.id}`}
                    icon={<EditOutlined />}
                    onClick={() => {
                      setNote(o.paymentNote || "");
                      setAction({ id: o.id, type: "note" });
                    }}
                  />
                </Tooltip>
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
                      onClick={() => {
                        setNote(o.paymentNote || "");
                        setAction({ id: o.id, type: "deposit" });
                      }}
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
                      onClick={() => {
                        setNote(o.paymentNote || "");
                        setAction({ id: o.id, type: "full" });
                      }}
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
                        !["Đã hủy", "Hoàn hàng"].includes(o.status) ||
                        !o.paid ||
                        (o.refunded || 0) >= o.paid ||
                        o.paymentStatus === "refunded"
                      }
                      onClick={() => {
                        setNote(o.paymentNote || "");
                        setAction({ id: o.id, type: "refund" });
                      }}
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
          action?.type === "note"
            ? "Ghi chú thanh toán"
            : action?.type === "refund"
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
        {action?.type !== "note" && (
          <p>
            {action?.type === "refund"
              ? "Bạn xác nhận đã hoàn tiền cho khách hàng?"
              : "Bạn xác nhận đã nhận tiền thanh toán cho đơn hàng này?"}
          </p>
        )}
        <label htmlFor="payment-note">Ghi chú thanh toán</label>
        <Input.TextArea
          id="payment-note"
          rows={3}
          maxLength={1000}
          showCount
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>
    </>
  );
}

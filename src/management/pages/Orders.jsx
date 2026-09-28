import { orderColumns, statusTag } from "../orderColumns";
import { useState } from "react";
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Timeline,
} from "antd";
import { useManagement } from "../context";
import { PageTitle } from "../PageTitle";
import { nextStatuses, statusFlow, transitionOrder } from "../model";
import { money } from "../../utils/format";

export function OrdersPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(),
    [detailId, setDetailId] = useState(null);
  const detail = s.orders.find((o) => o.id === detailId);
  function show(o) {
    setDetailId(o.id);
    form.setFieldsValue({
      status: undefined,
      carrier: o.carrier || "",
      tracking: o.tracking || "",
      note: o.note || "",
    });
  }
  function save(values) {
    try {
      const next = values.status
        ? transitionOrder(detail, values.status, values)
        : {
            ...detail,
            carrier: values.carrier,
            tracking: values.tracking,
            note: values.note,
          };
      if (
        ["Đang giao hàng", "Giao thành công", "Đã hoàn thành"].includes(
          next.status,
        ) &&
        (!next.carrier?.trim() || !next.tracking?.trim())
      )
        throw new Error(
          "Đơn đang giao cần có đơn vị vận chuyển và mã vận đơn.",
        );
      s.updateOrder(next);
      setDetailId(null);
      message.success("Đã cập nhật đơn hàng");
    } catch (e) {
      message.error(e.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Quản lý đơn hàng"
        description="Xác nhận đơn, cập nhật vận chuyển và theo dõi xử lý đơn hàng."
      />
      <div className="mg-toolbar">
        <Input.Search
          placeholder="Tìm mã đơn, tên, email khách hàng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
        />
        <Select
          placeholder="Tất cả trạng thái"
          allowClear
          value={status}
          onChange={setStatus}
          options={[...statusFlow, "Đã hủy", "Hoàn hàng", "Hoàn tiền"].map(
            (value) => ({ value }),
          )}
        />
      </div>
      <Table
        rowKey="id"
        rowSelection={{}}
        scroll={{ x: 850 }}
        dataSource={s.orders.filter(
          (o) =>
            (!status || o.status === status) &&
            `${o.id} ${o.recipient?.name} ${o.owner}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )}
        columns={[
          ...orderColumns,
          {
            title: "Thao tác",
            render: (_, o) => (
              <Button onClick={() => show(o)}>Chi tiết / Sửa</Button>
            ),
          },
        ]}
      />
      <Modal
        title={`Chi tiết đơn ${detail?.id || ""}`}
        open={!!detail}
        width={900}
        onCancel={() => setDetailId(null)}
        onOk={() => form.submit()}
        okText="Lưu thay đổi"
        cancelText="Đóng"
        destroyOnHidden
      >
        {detail && (
          <>
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                {
                  key: "name",
                  label: "Khách hàng",
                  children: detail.recipient?.name,
                },
                {
                  key: "phone",
                  label: "Số điện thoại",
                  children: detail.recipient?.phone,
                },
                {
                  key: "address",
                  label: "Địa chỉ",
                  children: detail.recipient?.address,
                },
                {
                  key: "state",
                  label: "Trạng thái",
                  children: statusTag(detail.status),
                },
                {
                  key: "paid",
                  label: "Đã thanh toán",
                  children: money(detail.paid || 0),
                },
                {
                  key: "remaining",
                  label: "Còn phải trả",
                  children: money(
                    detail.remaining ?? detail.total - (detail.paid || 0),
                  ),
                },
              ]}
            />
            <Table
              className="mg-section"
              size="small"
              pagination={false}
              rowKey={(_, i) => String(i)}
              dataSource={detail.items}
              columns={[
                { title: "Sản phẩm", dataIndex: "name" },
                { title: "Biến thể", dataIndex: "variantLabel" },
                { title: "Số lượng", dataIndex: "quantity" },
                { title: "Đơn giá", dataIndex: "price", render: money },
              ]}
            />
            <p className="mg-total">
              Tổng thanh toán: <strong>{money(detail.total)}</strong>
            </p>
            <Form form={form} layout="vertical" onFinish={save}>
              <Form.Item name="status" label="Chuyển trạng thái">
                <Select
                  allowClear
                  placeholder="Giữ trạng thái hiện tại"
                  options={nextStatuses(detail)
                    .filter((x) => x !== "Hoàn tiền")
                    .map((value) => ({ value }))}
                />
              </Form.Item>
              <div className="mg-form-grid">
                <Form.Item name="carrier" label="Đơn vị vận chuyển">
                  <Input placeholder="Ví dụ: GHN" />
                </Form.Item>
                <Form.Item name="tracking" label="Mã vận đơn">
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="note" label="Ghi chú nội bộ">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
            <h3>Lịch sử xử lý</h3>
            <Timeline
              items={(detail.history?.length
                ? detail.history
                : [{ at: detail.createdAt, text: "Tạo đơn hàng" }]
              ).map((h) => ({
                content: `${new Date(h.at).toLocaleString("vi-VN")} — ${h.text}`,
              }))}
            />
          </>
        )}
      </Modal>
    </>
  );
}

export function PaymentsPage() {
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
            render: (_, o) => (
              <Space wrap>
                {!["Đã hủy", "Hoàn hàng", "Hoàn tiền"].includes(o.status) && (
                  <>
                    <Button
                      disabled={!o.deposit || o.paid >= o.deposit}
                      onClick={() => setAction({ id: o.id, type: "deposit" })}
                    >
                      Xác nhận cọc
                    </Button>
                    <Button
                      disabled={o.paid >= o.total}
                      onClick={() => setAction({ id: o.id, type: "full" })}
                    >
                      Đã thanh toán đủ
                    </Button>
                  </>
                )}
                <Button
                  danger
                  disabled={
                    !["Đã hủy", "Hoàn hàng"].includes(o.status) || !o.paid
                  }
                  onClick={() => setAction({ id: o.id, type: "refund" })}
                >
                  Hoàn tiền
                </Button>
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

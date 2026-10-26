import { userError } from "../../../shared/utils/userError";
import Button from "../components/ManagementButton";
import {
  orderColumns,
  statusTag,
} from "../components/orderColumns";
import { useEffect, useRef, useState } from "react";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import {
  App,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Timeline,
} from "antd";
import { useManagement } from "../hooks/useManagement";
import {
  nextStatuses,
  statusFlow,
  transitionOrder,
} from "../utils/management";
import { money } from "../../../shared/utils/format";

export default function OrdersPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(),
    [selected, setSelected] = useState([]),
    [detailId, setDetailId] = useState(null),
    [mode, setMode] = useState("view");
  const initializedEditOrder = useRef(null);
  const detail = s.orders.find((o) => o.id === detailId);
  const rows = s.orders.filter(
    (o) =>
      (!status || o.status === status) &&
      `${o.id} ${o.recipient?.name} ${o.owner}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function show(o, nextMode) {
    setMode(nextMode);
    setDetailId(o.id);
  }
  async function remove(ids) {
    try {
      const result = await s.removeOrders(ids);
      setSelected([]);
      const failed = result?.failed || [];
      if (failed.length) {
        message.warning(
          `Đã xóa ${result?.deleted_ids?.length || 0} đơn; ${failed.length} đơn không thể xóa vì còn lịch sử hoặc thanh toán.`,
        );
      } else {
        message.success("Đã xóa các đơn hàng đã chọn");
      }
    } catch (error) {
      message.error(userError(error));
    }
  }
  useEffect(() => {
    if (!detail || mode !== "edit") {
      initializedEditOrder.current = null;
      return;
    }
    if (initializedEditOrder.current === detail.id) return;
    initializedEditOrder.current = detail.id;
    form.setFieldsValue({
      status: undefined,
      carrier: detail.carrier || "",
      tracking: detail.tracking || "",
      note: detail.note || "",
    });
  }, [detail?.id, mode, form]);
  async function save(values) {
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
      await s.updateOrder(next);
      setDetailId(null);
      message.success("Đã cập nhật đơn hàng");
    } catch (e) {
      message.error(
        e?.message && (e?.status === 400 || !e?.status)
          ? e.message
          : userError(e),
      );
    }
  }
  return (
    <>
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
        <Popconfirm
          title="Xóa các đơn hàng đã chọn? Chỉ đơn đã hủy chưa thanh toán mới được xóa."
          onConfirm={() => remove(selected)}
        >
          <Button
            icon={<DeleteOutlined aria-hidden="true" />}
            danger
            disabled={!selected.length}
          >
            Xóa đã chọn ({selected.length})
          </Button>
        </Popconfirm>
      </div>
      <Table
        rowKey="id"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        scroll={{ x: 850 }}
        dataSource={rows}
        columns={[
          ...orderColumns,
          {
            title: "Thao tác",
            align: "center",
            width: 112,
            className: "mg-action-cell",
            render: (_, o) => (
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  aria-label={`Chi tiết ${o.id}`}
                  onClick={() => show(o, "view")}
                  title="Chi tiết"
                  className="mg-icon-action"
                />
                <Button
                  icon={<EditOutlined />}
                  aria-label={`Sửa ${o.id}`}
                  onClick={() => show(o, "edit")}
                  title="Sửa"
                  className="mg-icon-action"
                />
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`${mode === "edit" ? "Sửa" : "Chi tiết"} đơn ${detail?.id || ""}`}
        open={!!detail}
        width={900}
        onCancel={() => setDetailId(null)}
        onOk={() => form.submit()}
        okText="Lưu thay đổi"
        cancelText="Đóng"
        footer={
          mode === "view" ? (
            <Button onClick={() => setDetailId(null)}>Đóng</Button>
          ) : undefined
        }
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
                {
                  key: "carrier",
                  label: "Đơn vị vận chuyển",
                  children: detail.carrier || "Chưa cập nhật",
                },
                {
                  key: "tracking",
                  label: "Mã vận đơn",
                  children: detail.tracking || "Chưa cập nhật",
                },
                { key: "note", label: "Ghi chú", children: detail.note || "—" },
              ]}
            />
            <Table
              className="mg-section"
              size="small"
              pagination={false}
              scroll={{ x: 480 }}
              rowKey="lineKey"
              dataSource={detail.items.map((item, i) => ({
                ...item,
                lineKey: `${detail.id}-${i}`,
              }))}
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
            {mode === "edit" && (
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
                    <Input
                      placeholder="Ví dụ: GHN"
                      disabled={
                        ["cancelled", "refunded"].includes(detail.statusCode) ||
                        ["Đã hủy", "Hoàn tiền", "Đã hoàn tiền"].includes(detail.status)
                      }
                    />
                  </Form.Item>
                  <Form.Item name="tracking" label="Mã vận đơn">
                    <Input
                      disabled={
                        ["cancelled", "refunded"].includes(detail.statusCode) ||
                        ["Đã hủy", "Hoàn tiền", "Đã hoàn tiền"].includes(detail.status)
                      }
                    />
                  </Form.Item>
                </div>
                <Form.Item name="note" label="Ghi chú nội bộ">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Form>
            )}
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

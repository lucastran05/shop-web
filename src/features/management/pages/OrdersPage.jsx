import { userError } from "../../../shared/utils/userError";
import Button from "../components/ManagementButton";
import CopyCode from "../../../shared/components/CopyCode";
import ExpandableText from "../../../shared/components/ExpandableText";
import { orderColumns, statusTag } from "../components/orderColumns";
import { useState } from "react";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  App,
  Alert,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Steps,
  Table,
  Tabs,
  Timeline,
} from "antd";
import { useManagement } from "../hooks/useManagement";
import { nextStatuses, statusFlow, transitionOrder } from "../utils/management";
import { money } from "../../../shared/utils/format";
import { orderLabels } from "../../../shared/adapters/viewAdapters";
import {
  orderStatuses,
  orderStatusGroup,
} from "../../../shared/constants/shop";

const tabIcons = {
  all: <ShoppingOutlined />,
  "Chờ xác nhận": <ClockCircleOutlined />,
  "Đang chuẩn bị hàng": <InboxOutlined />,
  "Đang giao hàng": <TruckOutlined />,
  "Đã hoàn thành": <CheckCircleOutlined />,
  "Đã hủy": <CloseCircleOutlined />,
  "Hoàn hàng / Hoàn tiền": <UndoOutlined />,
};

const stageHints = {
  "Đã xác nhận":
    "Kiểm tra sản phẩm, số lượng, người nhận và địa chỉ trước khi xác nhận đơn.",
  "Đang chuẩn bị hàng":
    "Lấy đủ sản phẩm và đúng biến thể theo đơn. Ghi chú nếu có yêu cầu khi chuẩn bị hàng.",
  "Đã đóng gói":
    "Kiểm tra số lượng, tình trạng sản phẩm và hoàn tất đóng gói trước khi bàn giao vận chuyển.",
  "Đang giao hàng":
    "Nhập đơn vị vận chuyển và mã vận đơn sau khi bàn giao kiện hàng.",
  "Giao thành công":
    "Chỉ xác nhận khi đơn vị vận chuyển báo giao thành công và người nhận đã nhận hàng.",
  "Đã hoàn thành":
    "Đơn đã giao và được thanh toán đủ mới có thể hoàn thành. Xác nhận thanh toán tại trang Thanh toán.",
  "Đã hủy":
    "Ghi rõ lý do hủy đơn. Thao tác này kết thúc quy trình giao hàng của đơn.",
  "Hoàn hàng":
    "Chỉ xác nhận khi cửa hàng đã nhận lại hàng. Ghi rõ lý do và tình trạng hàng nhận lại.",
};

export default function OrdersPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState([]),
    [detailId, setDetailId] = useState(null),
    [mode, setMode] = useState("view"),
    [saving, setSaving] = useState(false),
    [exceptionStatus, setExceptionStatus] = useState(null),
    [reason, setReason] = useState("");
  const detail = s.orders.find((o) => o.id === detailId);
  const activeStatus = orderLabels[detail?.statusCode];
  const stageIndex = statusFlow.indexOf(activeStatus);
  const previousStage = statusFlow[stageIndex - 1];
  const nextStage = stageIndex >= 0 ? statusFlow[stageIndex + 1] : undefined;
  const allowed = nextStatuses(detail || {});
  const showShipment = stageIndex >= 3;
  const canCancel =
    stageIndex >= 0 &&
    stageIndex < 4 &&
    !detail?.shippedAt &&
    !detail?.history?.some((event) => event.status === "shipping") &&
    allowed.includes("Đã hủy");
  const unpaidCompletion =
    nextStage === "Đã hoàn thành" &&
    Number(detail?.paid || 0) < Number(detail?.total || 0);
  const searchedOrders = s.orders.filter((o) =>
    `${o.code} ${o.id} ${o.recipient?.name} ${o.owner}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const rows = searchedOrders.filter(
    (o) => status === "all" || orderStatusGroup(o.status) === status,
  );
  function show(o, nextMode) {
    setExceptionStatus(null);
    setReason("");
    form.resetFields();
    form.setFieldsValue({
      carrier: o.carrier || "",
      tracking: o.tracking || "",
      note: o.note || "",
    });
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
  async function save(targetStatus, exceptionReason) {
    if (saving) return;
    setSaving(true);
    try {
      const needsReason = ["Đã hủy", "Hoàn hàng"].includes(targetStatus);
      if (needsReason && !exceptionReason?.trim())
        throw new Error("Vui lòng nhập lý do.");
      const values = needsReason
        ? { note: exceptionReason.trim() }
        : await form.validateFields();
      const next = targetStatus
        ? transitionOrder(detail, targetStatus, values)
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
      setExceptionStatus(null);
      if (needsReason) setDetailId(null);
      message.success("Đã cập nhật đơn hàng");
    } catch (e) {
      if (e?.errorFields) return;
      message.error(
        e?.message && (e?.status === 400 || !e?.status)
          ? e.message
          : userError(e),
      );
    } finally {
      setSaving(false);
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
      <Tabs
        activeKey={status}
        onChange={setStatus}
        items={["all", ...orderStatuses].map((value) => ({
          key: value,
          icon: tabIcons[value],
          label: (
            <span className="orders-tab-label">
              {value === "all" ? "Tất cả" : value}
              <span>
                {value === "all"
                  ? searchedOrders.length
                  : searchedOrders.filter(
                      (o) => orderStatusGroup(o.status) === value,
                    ).length}
              </span>
            </span>
          ),
        }))}
      />
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
                  aria-label={`Chi tiết đơn của ${o.recipient?.name || "khách hàng"}`}
                  onClick={() => show(o, "view")}
                  title="Chi tiết"
                  className="mg-icon-action"
                />
                <Button
                  icon={<EditOutlined />}
                  aria-label={`Xử lý đơn của ${o.recipient?.name || "khách hàng"}`}
                  onClick={() => show(o, "edit")}
                  title="Xử lý đơn"
                  className="mg-icon-action"
                />
              </Space>
            ),
          },
        ]}
      />
      <Modal
        className="mg-editor-modal mg-order-modal"
        title={mode === "edit" ? "Xử lý đơn hàng" : "Chi tiết đơn hàng"}
        open={!!detail}
        width={900}
        onCancel={() => !saving && setDetailId(null)}
        closable={!saving}
        maskClosable={!saving}
        footer={
          mode === "edit" && stageIndex >= 0 ? (
            <div className="mg-order-footer">
              <Space wrap>
                {canCancel && (
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    disabled={saving}
                    onClick={() => {
                      setReason("");
                      setExceptionStatus("Đã hủy");
                    }}
                  >
                    Hủy đơn
                  </Button>
                )}
                {allowed.includes("Hoàn hàng") && (
                  <Button
                    danger
                    icon={<UndoOutlined />}
                    disabled={saving}
                    onClick={() => {
                      setReason("");
                      setExceptionStatus("Hoàn hàng");
                    }}
                  >
                    Hoàn hàng
                  </Button>
                )}
              </Space>
              <Space wrap>
                {previousStage && allowed.includes(previousStage) && (
                  <Button
                    icon={<ArrowLeftOutlined />}
                    title={previousStage}
                    disabled={saving}
                    onClick={() => save(previousStage)}
                  >
                    Giai đoạn trước
                  </Button>
                )}
                {nextStage && allowed.includes(nextStage) && (
                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    title={nextStage}
                    loading={saving}
                    disabled={unpaidCompletion}
                    onClick={() => save(nextStage)}
                  >
                    Giai đoạn sau
                  </Button>
                )}
              </Space>
            </div>
          ) : null
        }
        destroyOnHidden
      >
        {detail && (
          <>
            <div className="mg-order-progress">
              <Steps
                size="small"
                current={statusFlow.indexOf(orderLabels[detail.statusCode])}
                items={statusFlow.map((title) => ({ title }))}
              />
            </div>
            {["cancelled", "returned", "refunded"].includes(
              detail.statusCode,
            ) && (
              <Alert
                className="mg-section"
                showIcon
                type="warning"
                title={`Đơn hàng: ${detail.status}. Quy trình giao hàng đã kết thúc.`}
              />
            )}
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                {
                  key: "code",
                  label: "Mã đơn hàng",
                  children: orderColumns[0].render(detail.code || detail.id),
                },
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
                  children: detail.tracking ? (
                    <CopyCode value={detail.tracking} />
                  ) : (
                    "Chưa cập nhật"
                  ),
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
                {
                  title: "Sản phẩm",
                  dataIndex: "name",
                  render: (name) => (
                    <ExpandableText text={name} maxLength={40} />
                  ),
                },
                { title: "Biến thể", dataIndex: "variantLabel" },
                { title: "Số lượng", dataIndex: "quantity" },
                { title: "Đơn giá", dataIndex: "price", render: money },
              ]}
            />
            <p className="mg-total">
              Tổng thanh toán: <strong>{money(detail.total)}</strong>
            </p>
            {mode === "edit" && (
              <Form
                form={form}
                layout="vertical"
                onFinish={() => save()}
                disabled={saving}
              >
                {stageIndex >= 0 && (
                  <Alert
                    className="mg-order-hint"
                    showIcon
                    type={unpaidCompletion ? "warning" : "info"}
                    title={
                      unpaidCompletion
                        ? `Còn phải thanh toán ${money(Number(detail.total) - Number(detail.paid || 0))}`
                        : nextStage
                          ? `Giai đoạn tiếp theo: ${nextStage}`
                          : activeStatus
                    }
                    description={stageHints[nextStage || activeStatus]}
                  />
                )}
                {showShipment && (
                  <div className="mg-form-grid">
                    <Form.Item
                      name="carrier"
                      label="Đơn vị vận chuyển"
                      rules={[
                        {
                          required: stageIndex >= 4,
                          whitespace: true,
                          message: "Nhập đơn vị vận chuyển",
                        },
                      ]}
                    >
                      <Input placeholder="Ví dụ: GHN" />
                    </Form.Item>
                    <Form.Item
                      name="tracking"
                      label="Mã vận đơn"
                      rules={[
                        {
                          required: stageIndex >= 4,
                          whitespace: true,
                          message: "Nhập mã vận đơn",
                        },
                      ]}
                    >
                      <Input placeholder="Mã tra cứu của kiện hàng" />
                    </Form.Item>
                  </div>
                )}
                <Form.Item name="note" label="Ghi chú xử lý">
                  <Input.TextArea
                    rows={2}
                    placeholder="Thông tin bổ sung ở giai đoạn này (không bắt buộc)"
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saving}
                  >
                    Cập nhật thông tin
                  </Button>
                </Form.Item>
              </Form>
            )}
            <h3>Lịch sử xử lý</h3>
            <Timeline
              items={(detail.history?.length
                ? detail.history
                : [{ at: detail.createdAt, text: "Tạo đơn hàng" }]
              ).map((h) => ({
                content: (
                  <>
                    <div>
                      {new Date(h.at).toLocaleString("vi-VN")} — {h.text}
                    </div>
                    {h.note && h.note !== h.text && <div>{h.note}</div>}
                    {h.actor_name && <small>{h.actor_name}</small>}
                  </>
                ),
              }))}
            />
          </>
        )}
      </Modal>
      <Modal
        title={
          exceptionStatus === "Hoàn hàng"
            ? "Xác nhận nhận lại hàng"
            : "Xác nhận hủy đơn"
        }
        open={!!exceptionStatus}
        onCancel={() => !saving && setExceptionStatus(null)}
        onOk={() => save(exceptionStatus, reason)}
        okText={
          exceptionStatus === "Hoàn hàng"
            ? "Xác nhận hoàn hàng"
            : "Xác nhận hủy đơn"
        }
        cancelText="Quay lại"
        confirmLoading={saving}
        okButtonProps={{ danger: true }}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        maskClosable={!saving}
      >
        <p>{stageHints[exceptionStatus]}</p>
        <Input.TextArea
          aria-label="Lý do"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Nhập lý do cụ thể (bắt buộc)"
          disabled={saving}
        />
      </Modal>
    </>
  );
}

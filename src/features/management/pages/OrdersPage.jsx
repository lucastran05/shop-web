import { userError } from "../../../shared/utils/userError";
import Button from "../components/ManagementButton";
import CopyCode from "../../../shared/components/CopyCode";
import ExpandableText from "../../../shared/components/ExpandableText";
import { orderColumns, statusTag } from "../components/orderColumns";
import OrderRowActions from "../components/OrderRowActions";
import { useState } from "react";
import {
  DeleteOutlined,
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
  WalletOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
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
  Tooltip,
} from "antd";
import { useManagement } from "../hooks/useManagement";
import { nextStatuses, statusFlow, transitionOrder } from "../utils/management";
import { money } from "../../../shared/utils/format";
import { orderLabels } from "../../../shared/adapters/viewAdapters";
import {
  orderStatuses,
  orderStatusGroup,
  canAdminConfirm,
  canCancelOrder,
} from "../../../shared/constants/shop";

const tabIcons = {
  all: <ShoppingOutlined />,
  "Chờ thanh toán": <WalletOutlined />,
  "Chờ xác nhận": <ClockCircleOutlined />,
  "Đang chuẩn bị hàng": <InboxOutlined />,
  "Đang giao hàng": <TruckOutlined />,
  "Đã hoàn thành": <CheckCircleOutlined />,
  "Đã hủy": <CloseCircleOutlined />,
  "Hoàn hàng / Hoàn tiền": <UndoOutlined />,
};

const stageActionLabels = {
  "Đã xác nhận": "Xác nhận đơn",
  "Đang chuẩn bị hàng": "Chuẩn bị hàng",
  "Đã đóng gói": "Đóng gói xong",
  "Đang giao hàng": "Bàn giao vận chuyển",
  "Giao thành công": "Giao thành công",
  "Đã hoàn thành": "Hoàn tất đơn hàng",
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
    [reason, setReason] = useState(""),
    [cancellingOrder, setCancellingOrder] = useState(null),
    [cancelReason, setCancelReason] = useState("");
  const detail = s.orders.find((o) => o.id === detailId);
  const activeStatus = orderLabels[detail?.statusCode] || detail?.status;
  const stageIndex = statusFlow.indexOf(activeStatus);
  const previousStage = statusFlow[stageIndex - 1];
  const nextStage = stageIndex >= 0 ? statusFlow[stageIndex + 1] : undefined;
  const allowed = nextStatuses(detail || {});
  const showShipment = stageIndex >= 3;
  const canCancel = canCancelOrder(detail);
  const cannotConfirm = nextStage === "Đã xác nhận" && !canAdminConfirm(detail);
  const unpaidCompletion =
    nextStage === "Đã hoàn thành" &&
    Number(detail?.paid || 0) < Number(detail?.total || 0);
  const searchedOrders = s.orders.filter((o) =>
    `${o.code} ${o.id} ${o.recipient?.name} ${o.owner}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const rows = searchedOrders.filter((o) => {
    if (status === "all") return true;
    return orderStatusGroup(o.status) === status;
  });

  function promptCancel(order) {
    setCancellingOrder(order);
    setCancelReason("");
  }

  async function confirmCancel() {
    if (!cancellingOrder || saving) return;
    setSaving(true);
    try {
      const reasonText = cancelReason.trim() || "Cửa hàng hủy đơn";
      const next = transitionOrder(cancellingOrder, "Đã hủy", {
        note: reasonText,
      });
      await s.updateOrder(next);
      setCancellingOrder(null);
      if (detailId === cancellingOrder.id) {
        setDetailId(null);
      }
      message.success("Đã hủy đơn hàng");
    } catch (e) {
      message.error(e?.message || userError(e));
    } finally {
      setSaving(false);
    }
  }

  async function quickAdvance(order, targetStatus) {
    if (saving) return;
    setSaving(true);
    try {
      if (targetStatus === "Đã xác nhận" && !canAdminConfirm(order)) {
        throw new Error(
          "Đơn hàng chưa thanh toán. Phải thanh toán xong mới được xác nhận (ngoại trừ thanh toán khi nhận hàng).",
        );
      }
      const next = transitionOrder(order, targetStatus);
      await s.updateOrder(next);
      message.success(`Đã chuyển sang trạng thái: ${targetStatus}`);
    } catch (e) {
      message.error(e?.message || userError(e));
    } finally {
      setSaving(false);
    }
  }

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
      if (needsReason || mode === "shipment") setDetailId(null);
      if (mode === "shipment") setStatus("Đang giao hàng");
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
        items={[
          {
            key: "all",
            icon: tabIcons.all,
            label: (
              <span className="orders-tab-label">
                Tất cả <span>{searchedOrders.length}</span>
              </span>
            ),
          },
          ...orderStatuses.map((value) => ({
            key: value,
            icon: tabIcons[value],
            label: (
              <span className="orders-tab-label">
                {value}
                <span>
                  {
                    searchedOrders.filter(
                      (o) => orderStatusGroup(o.status) === value,
                    ).length
                  }
                </span>
              </span>
            ),
          })),
        ]}
      />
      <Table
        rowKey="id"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        scroll={{ x: 950 }}
        dataSource={rows}
        columns={[
          ...orderColumns,
          {
            title: "Thao tác",
            align: "center",
            width: 200,
            className: "mg-action-cell",
            render: (_, order) => (
              <OrderRowActions
                order={order}
                saving={saving}
                onConfirm={(o) => quickAdvance(o, "Đã xác nhận")}
                onShip={(o) => show(o, "shipment")}
                onDelivered={(o) => quickAdvance(o, "Giao thành công")}
                onReturn={(o) => {
                  show(o, "return");
                  setExceptionStatus("Hoàn hàng");
                }}
                onView={(o) => show(o, "view")}
                onEdit={(o) => show(o, "edit")}
                onCancel={promptCancel}
              />
            ),
          },
        ]}
      />
      <Modal
        className="mg-editor-modal mg-order-modal"
        title={mode === "edit" ? "Xử lý đơn hàng" : "Chi tiết đơn hàng"}
        open={!!detail && mode !== "shipment" && mode !== "return"}
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
                    onClick={() => promptCancel(detail)}
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
                {nextStage &&
                  allowed.includes(nextStage) &&
                  (cannotConfirm ? (
                    <Tooltip title="Đơn hàng chưa thanh toán. Phải thanh toán xong mới được xác nhận (ngoại trừ thanh toán khi nhận hàng).">
                      <span>
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          disabled
                        >
                          {stageActionLabels[nextStage] || nextStage}
                        </Button>
                      </span>
                    </Tooltip>
                  ) : unpaidCompletion ? (
                    <Tooltip
                      title={`Còn phải thanh toán ${money(Number(detail.total) - Number(detail.paid || 0))}`}
                    >
                      <span>
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          disabled
                        >
                          {stageActionLabels[nextStage] || nextStage}
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      title={nextStage}
                      loading={saving}
                      onClick={() => save(nextStage)}
                    >
                      {stageActionLabels[nextStage] || nextStage}
                    </Button>
                  ))}
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
        title="Thông tin vận chuyển"
        open={!!detail && mode === "shipment"}
        onCancel={() => !saving && setDetailId(null)}
        onOk={() => save("Đang giao hàng")}
        okText="Lưu và giao hàng"
        cancelText="Quay lại"
        confirmLoading={saving}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        maskClosable={!saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" disabled={saving}>
          <Form.Item
            name="carrier"
            label="Đơn vị vận chuyển"
            rules={[
              {
                required: true,
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
              { required: true, whitespace: true, message: "Nhập mã vận đơn" },
            ]}
          >
            <Input placeholder="Mã tra cứu của kiện hàng" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          exceptionStatus === "Hoàn hàng"
            ? "Xác nhận nhận lại hàng"
            : "Xác nhận hủy đơn"
        }
        open={!!exceptionStatus}
        onCancel={() => {
          if (saving) return;
          setExceptionStatus(null);
          if (mode === "return") setDetailId(null);
        }}
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
        <p>Vui lòng nhập lý do để xác nhận xử lý đơn hàng.</p>
        <Input.TextArea
          aria-label="Lý do"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Nhập lý do cụ thể (bắt buộc)"
          disabled={saving}
        />
      </Modal>
      <Modal
        title="Xác nhận hủy đơn hàng"
        open={!!cancellingOrder}
        onCancel={() => !saving && setCancellingOrder(null)}
        onOk={confirmCancel}
        okText="Xác nhận hủy đơn"
        cancelText="Quay lại"
        confirmLoading={saving}
        okButtonProps={{ danger: true }}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        maskClosable={!saving}
      >
        <p>
          Bạn có chắc chắn muốn hủy đơn hàng{" "}
          <strong>{cancellingOrder?.code || cancellingOrder?.id}</strong> không?
        </p>
        <Input.TextArea
          aria-label="Lý do hủy đơn"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          rows={3}
          placeholder="Nhập lý do hủy đơn (không bắt buộc)"
          disabled={saving}
        />
      </Modal>
    </>
  );
}

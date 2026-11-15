import { Popconfirm, Space } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  TruckOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import Button from "./ManagementButton";
import { nextStatuses } from "../utils/management";
import {
  orderStatusGroup,
  isAwaitingPayment,
  canCancelOrder,
} from "../../../shared/constants/shop";

/**
 * Các nút trong cột "Thao tác" của bảng đơn hàng.
 *
 * Gồm 2 nhóm:
 *  1. Nút xử lý nhanh: chỉ hiện khi đơn đang ở bước cho phép (xem QuickActions).
 *  2. Nút luôn có: Xem chi tiết, Xử lý đơn, và Hủy đơn (nếu đơn còn hủy được).
 *
 * Component này chỉ lo phần hiển thị. Mọi xử lý thật (gọi API, mở modal)
 * do OrdersPage truyền vào qua các hàm on...
 */
export default function OrderRowActions({
  order,
  saving,
  onConfirm,
  onShip,
  onDelivered,
  onReturn,
  onView,
  onEdit,
  onCancel,
}) {
  const customerName = order.recipient?.name || "khách hàng";

  return (
    <Space size={4} wrap>
      <QuickActions
        order={order}
        saving={saving}
        onConfirm={onConfirm}
        onShip={onShip}
        onDelivered={onDelivered}
        onReturn={onReturn}
      />

      <Button
        className="mg-icon-action"
        icon={<EyeOutlined />}
        title="Chi tiết"
        aria-label={`Chi tiết đơn của ${customerName}`}
        onClick={() => onView(order)}
      />

      <Button
        className="mg-icon-action"
        icon={<EditOutlined />}
        title="Xử lý đơn"
        aria-label={`Xử lý đơn của ${customerName}`}
        onClick={() => onEdit(order)}
      />

      {canCancelOrder(order) && (
        <Button
          size="small"
          danger
          className="mg-icon-action"
          icon={<CloseCircleOutlined />}
          aria-label="Hủy đơn"
          disabled={saving}
          onClick={() => onCancel(order)}
        />
      )}
    </Space>
  );
}

/**
 * Nút xử lý nhanh, tùy theo nhóm trạng thái của đơn:
 *
 *  Chờ xác nhận        -> nút Xác nhận đơn (hỏi lại trước khi làm)
 *  Đang chuẩn bị hàng  -> nút Giao hàng (mở form nhập vận chuyển)
 *  Đang giao hàng      -> nút Đã giao (hỏi lại) và nút Hoàn hàng
 *  Còn lại             -> không có nút nào
 *
 * Đơn đang chờ khách thanh toán thì không hiện nút nào.
 * Mỗi nút chỉ hiện khi trạng thái đích nằm trong danh sách nextStatuses,
 * tức là bước chuyển đó hợp lệ theo quy trình đơn hàng.
 */
function QuickActions({
  order,
  saving,
  onConfirm,
  onShip,
  onDelivered,
  onReturn,
}) {
  if (isAwaitingPayment(order)) return null;

  const group = orderStatusGroup(order.status);
  const allowedNext = nextStatuses(order);
  const canMoveTo = (status) => allowedNext.includes(status);

  if (group === "Chờ xác nhận" && canMoveTo("Đã xác nhận")) {
    return (
      <ConfirmIconButton
        question="Xác nhận đơn hàng này?"
        okText="Xác nhận"
        icon={<CheckCircleOutlined />}
        label="Xác nhận đơn"
        saving={saving}
        onConfirm={() => onConfirm(order)}
      />
    );
  }

  if (group === "Đang chuẩn bị hàng" && canMoveTo("Đang giao hàng")) {
    return (
      <Button
        size="small"
        type="primary"
        className="mg-icon-action"
        icon={<TruckOutlined />}
        aria-label="Nhập vận chuyển và giao hàng"
        disabled={saving}
        onClick={() => onShip(order)}
      />
    );
  }

  if (group === "Đang giao hàng") {
    return (
      <>
        {canMoveTo("Giao thành công") && (
          <ConfirmIconButton
            question="Xác nhận đã giao hàng thành công?"
            okText="Đã giao hàng"
            icon={<CheckCircleOutlined />}
            label="Xác nhận đã giao hàng"
            saving={saving}
            onConfirm={() => onDelivered(order)}
          />
        )}
        {canMoveTo("Hoàn hàng") && (
          <Button
            size="small"
            danger
            className="mg-icon-action"
            icon={<UndoOutlined />}
            aria-label="Hoàn hàng"
            disabled={saving}
            onClick={() => onReturn(order)}
          />
        )}
      </>
    );
  }

  return null;
}

/**
 * Nút icon màu chính, bấm vào sẽ hiện hộp hỏi lại (Popconfirm).
 * Chỉ khi người dùng bấm đồng ý thì mới gọi onConfirm.
 */
function ConfirmIconButton({ question, okText, icon, label, saving, onConfirm }) {
  return (
    <Popconfirm
      title={question}
      okText={okText}
      cancelText="Quay lại"
      disabled={saving}
      onConfirm={onConfirm}
    >
      <Button
        size="small"
        type="primary"
        className="mg-icon-action"
        icon={icon}
        aria-label={label}
        disabled={saving}
      />
    </Popconfirm>
  );
}

import { Popconfirm } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Button from "./ManagementButton";

export default function BulkActions({
  keys,
  selected,
  onSelect,
  onDelete,
  description,
}) {
  const chosen = selected.filter((key) => keys.includes(key));
  return (
    <Popconfirm
      title={`Xóa ${chosen.length} mục đã chọn?`}
      description={description}
      onConfirm={() => {
        onDelete(chosen);
        onSelect([]);
      }}
      okText="Xóa"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
    >
      <Button
        danger
        icon={<DeleteOutlined aria-hidden="true" />}
        disabled={!chosen.length}
      >
        Xóa đã chọn ({chosen.length})
      </Button>
    </Popconfirm>
  );
}

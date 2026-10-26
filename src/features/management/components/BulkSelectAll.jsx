import { Checkbox } from "antd";

export default function BulkSelectAll({ keys, selected, onSelect }) {
  const count = selected.filter((key) => keys.includes(key)).length;
  return (
    <Checkbox
      aria-label={`Chọn tất cả (${keys.length})`}
      checked={keys.length > 0 && count === keys.length}
      indeterminate={count > 0 && count < keys.length}
      disabled={!keys.length}
      onChange={(event) => onSelect(event.target.checked ? keys : [])}
    />
  );
}

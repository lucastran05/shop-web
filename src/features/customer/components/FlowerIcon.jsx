import Icon from "@ant-design/icons";

// Ant Design không có icon bông hoa nên tự vẽ: 5 cánh viền quanh nhụy tô đặc.
// Dùng currentColor để icon tự lấy màu chữ của nút hoặc tab chứa nó.
function FlowerSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="12"
          cy="6.4"
          rx="2.9"
          ry="3.9"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function FlowerIcon(props) {
  return <Icon component={FlowerSvg} {...props} />;
}

import { useTranslation } from "react-i18next";

// Bộ chọn số lượng dạng − 1 + (thay InputNumber ở phía khách hàng)
export default function QtyStepper({
  value,
  min = 1,
  max = Infinity,
  disabled = false,
  label,
  size = "default",
  onChange,
}) {
  const { t } = useTranslation();
  const upper = Math.max(min, max || min);
  const set = (next) => {
    const n = Math.max(min, Math.min(upper, Math.floor(Number(next) || min)));
    if (n !== value) onChange(n);
  };
  return (
    <div
      className={"bt-qty" + (size === "small" ? " is-small" : "")}
      role="group"
      aria-label={label || t("Số lượng")}
    >
      <button
        type="button"
        aria-label={t("Giảm số lượng")}
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
      >
        −
      </button>
      <input
        inputMode="numeric"
        aria-label={label || t("Số lượng")}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (digits) set(digits);
        }}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        aria-label={t("Tăng số lượng")}
        disabled={disabled || value >= upper}
        onClick={() => set(value + 1)}
      >
        +
      </button>
    </div>
  );
}

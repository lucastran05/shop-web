import { Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import provinces from "../constants/addresses.json";

// Province Open API v2 snapshot: https://provinces.open-api.vn/ (2026-10-12).
export function formatAddress(values) {
  return [values.addressDetail?.trim(), values.ward, values.province]
    .filter(Boolean)
    .join(", ");
}

export default function AddressFields({ form }) {
  const { t } = useTranslation();
  const province = Form.useWatch("province", form);
  const wards = provinces.find((p) => p.name === province)?.wards || [];
  return (
    <>
      <Form.Item
        name="province"
        label={t("Tỉnh / Thành phố")}
        rules={[{ required: true, message: t("Chọn tỉnh / thành phố") }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={provinces.map((p) => ({ value: p.name, label: p.name }))}
          onChange={() => form.setFieldValue("ward", undefined)}
        />
      </Form.Item>
      <Form.Item
        name="ward"
        label={t("Phường / Xã")}
        rules={[{ required: true, message: t("Chọn phường / xã") }]}
      >
        <Select
          disabled={!province}
          showSearch
          optionFilterProp="label"
          options={wards.map((w) => ({ value: w.name, label: w.name }))}
        />
      </Form.Item>
      <Form.Item
        name="addressDetail"
        label={t("Địa chỉ chi tiết")}
        rules={[
          {
            required: true,
            whitespace: true,
            message: t("Nhập số nhà, tên đường"),
          },
        ]}
      >
        <Input.TextArea
          rows={2}
          maxLength={250}
          placeholder={t("Số nhà, tên đường, tòa nhà…")}
        />
      </Form.Item>
    </>
  );
}

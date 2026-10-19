import { userError } from "../utils/userError";
import { Alert, Form, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../services/api";

export default function AddressFields({ form }) {
  const { t } = useTranslation();
  const provinceCode = Form.useWatch("province_code", form);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.addresses
      .provinces()
      .then(({ data }) => {
        if (active) {
          setProvinces(data);
          setError("");
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof ApiError
              ? userError(cause)
              : t("Không thể tải danh sách tỉnh/thành phố"),
          );
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!provinceCode) return;
    let active = true;
    setLoadingWards(true);
    api.addresses
      .wards({ province_code: provinceCode })
      .then(({ data }) => {
        if (active) {
          setWards(data);
          setError("");
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof ApiError
              ? userError(cause)
              : t("Không thể tải danh sách phường/xã"),
          );
      })
      .finally(() => {
        if (active) setLoadingWards(false);
      });
    return () => {
      active = false;
    };
  }, [provinceCode, t]);

  return (
    <>
      {error && <Alert type="error" showIcon message={error} />}
      <Form.Item
        name="province_code"
        label={t("Tỉnh / Thành phố")}
        rules={[{ required: true, message: t("Chọn tỉnh / thành phố") }]}
      >
        <Select
          loading={loadingProvinces}
          showSearch
          optionFilterProp="label"
          options={provinces.map((p) => ({ value: p.code, label: p.name }))}
          onChange={() => form.setFieldValue("ward_code", undefined)}
        />
      </Form.Item>
      <Form.Item
        name="ward_code"
        label={t("Phường / Xã")}
        rules={[{ required: true, message: t("Chọn phường / xã") }]}
      >
        <Select
          disabled={!provinceCode}
          loading={loadingWards}
          showSearch
          optionFilterProp="label"
          options={wards.map((w) => ({ value: w.code, label: w.name }))}
        />
      </Form.Item>
      <Form.Item
        name="street_address"
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

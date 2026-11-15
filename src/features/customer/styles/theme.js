// Theme Ant Design riêng cho phần khách hàng (phong cách tạp chí thực vật).
// Phần quản lý vẫn dùng theme chung trong app/styles/theme.js.
export const botanicalTheme = {
  token: {
    colorPrimary: "#3c6a2c",
    colorInfo: "#6b4a8a",
    colorSuccess: "#3c6a2c",
    colorWarning: "#b7861a",
    colorError: "#b3372f",
    colorLink: "#3c6a2c",
    colorText: "#1e2a1f",
    colorTextSecondary: "#56604f",
    colorBorder: "rgba(30, 42, 31, 0.22)",
    colorBorderSecondary: "rgba(30, 42, 31, 0.12)",
    colorBgContainer: "#f7f8f1",
    colorBgElevated: "#f7f8f1",
    colorBgLayout: "#edefe4",
    borderRadius: 10,
    borderRadiusLG: 18,
    fontSize: 15,
    fontFamily: `"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif`,
    boxShadowSecondary: "0 18px 40px -18px rgba(30, 42, 31, 0.35)",
  },
  components: {
    Button: {
      controlHeight: 40,
      controlHeightLG: 50,
      borderRadius: 999,
      borderRadiusLG: 999,
      fontWeight: 500,
      primaryShadow: "none",
      defaultShadow: "none",
    },
    Input: {
      controlHeight: 40,
      activeShadow: "0 0 0 3px rgba(107,74,138,.18)",
    },
    InputNumber: { controlHeight: 40 },
    Select: { controlHeight: 40 },
    Tag: { borderRadiusSM: 999 },
    Card: { borderRadiusLG: 18 },
    Spin: { colorBgMask: "#edefe4" },
  },
};

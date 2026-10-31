export const antThemeConfig = {
  token: {
    colorPrimary: '#468432',       // Màu chủ đạo (Primary color)
    colorSuccess: '#52c41a',       // Màu thành công
    colorWarning: '#faad14',       // Màu cảnh báo
    colorError: '#ff4d4f',         // Màu báo lỗi
    colorInfo: '#468432',          // Màu thông tin
    borderRadius: 8,               // Bo tròn viền mặc định
    fontSize: 14,                  // Cỡ chữ tiêu chuẩn
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  },
  components: {
    Spin: {
      colorBgMask: '#f5f5f5',
    },
    Button: {
      borderRadius: 6,
      controlHeight: 38,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 10,
    },
    Input: {
      controlHeight: 38,
      borderRadius: 6,
    },
  },
};

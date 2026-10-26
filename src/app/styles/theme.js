export const antThemeConfig = {
  token: {
    colorPrimary: '#1677ff',       // Màu chủ đạo (Primary color)
    colorSuccess: '#52c41a',       // Màu thành công
    colorWarning: '#faad14',       // Màu cảnh báo
    colorError: '#ff4d4f',         // Màu báo lỗi
    colorInfo: '#1677ff',          // Màu thông tin
    borderRadius: 8,               // Bo tròn viền mặc định
    fontSize: 14,                  // Cỡ chữ tiêu chuẩn
    fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  },
  components: {
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

export const GENERAL_ERROR = "Có lỗi xảy ra. Vui lòng thử lại sau.";

export function userError(error) {
  if (error?.status === 401)
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error?.status === 403)
    return "Bạn không có quyền thực hiện thao tác này.";
  if (error?.kind === "network" || [502, 503, 504].includes(error?.status))
    return "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
  if (error?.kind === "timeout")
    return "Máy chủ phản hồi chậm. Vui lòng thử lại.";
  return GENERAL_ERROR;
}

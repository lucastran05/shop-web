export const GENERAL_ERROR = "Có lỗi xảy ra. Vui lòng thử lại sau.";

export function userError(error) {
  if (error?.status === 401)
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error?.status === 403)
    return "Bạn không có quyền thực hiện thao tác này.";
  return GENERAL_ERROR;
}

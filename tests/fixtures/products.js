export const sampleProducts = Array.from({ length: 8 }, (_, i) => {
  const id = i + 1,
    price = [249000, 229000, 459000, 389000, 269000, 489000, 429000, 699000][i];
  return {
    id,
    name: `Sản phẩm ${String(id).padStart(2, "0")}`,
    category: `Danh mục ${(i % 3) + 1}`,
    description:
      "Sản phẩm mẫu dùng để minh họa chức năng mua hàng. Nội dung mô tả, hình ảnh và thuộc tính có thể được thay đổi theo sản phẩm thực tế.",
    image: `/products/${id}.svg`,
    images: [`/products/${id}.svg`, `/products/${id}-detail.svg`],
    featured: i < 4,
    deposit: [3, 4, 6, 7, 8].includes(id),
    attributes: [
      { label: "Mã sản phẩm", value: `SP${String(id).padStart(3, "0")}` },
      { label: "Chất liệu", value: "Thông tin mẫu — cập nhật theo sản phẩm" },
      { label: "Thông số", value: "Thông tin mẫu — cập nhật theo sản phẩm" },
    ],
    variants: [
      {
        id: "standard",
        label: "Tiêu chuẩn",
        color: "Trắng",
        price,
        oldPrice: [1, 3].includes(id) ? price + 50000 : null,
        stock: id === 8 ? 0 : 20,
      },
      {
        id: "option-2",
        label: "Tùy chọn 2",
        color: "Đen",
        price: price + 50000,
        stock: id === 8 ? 0 : 8,
      },
    ],
  };
});

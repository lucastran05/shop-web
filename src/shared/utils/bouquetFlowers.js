import { listAll } from "../adapters/viewAdapters.js";

export async function loadBouquetFlowers(products) {
  const data = await listAll((query) =>
    products.list({ ...query, sold_by_stem: true }),
  );
  const details = await Promise.all(data.map((item) => products.get(item.id)));
  return details
    .filter(({ data: product }) => product.variants?.length)
    .map(({ data: product }) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      options: product.variants.map((variant) => ({
        key: `${product.id}|${variant.id}`,
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        // Biến thể không đặt màu (vd sản phẩm chỉ có một loại) thì lấy tên biến thể làm nhãn
        color: variant.color || variant.label || "",
        price: Number(variant.price) || 0,
        stock: Number(variant.stock_quantity) || 0,
        // Một ảnh cho mỗi màu: ảnh cành nếu có, không thì ảnh của biến thể (cùng ảnh admin thấy)
        headSize: (Number(product.stem_head_size) || 100) / 100,
        stemImage: variant.stem_image || variant.image || "",
        photo: variant.stem_photo || null,
        thumb:
          variant.stem_image || variant.image || "/product-placeholder.svg",
      })),
    }));
}

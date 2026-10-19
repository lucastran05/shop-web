export function mapProductSummary(product) {
  return {
    ...product,
    category: product.category.name,
    image: product.image_url,
    oldPrice: product.old_price,
    stock: product.stock_quantity,
    featured: product.is_pinned,
    variants: [],
  };
}

export function mapProductDetail(product) {
  return {
    ...mapProductSummary({
      ...product,
      image_url: product.images[0]?.url || "",
      old_price: product.old_price,
    }),
    images: product.images.map((image) => image.url),
    variants: product.variants.length
      ? product.variants.map((variant) => ({
          ...variant,
          oldPrice: variant.old_price,
          stock: variant.stock_quantity,
        }))
      : [
          {
            id: "default",
            label: "Mặc định",
            color: "",
            price: product.price,
            oldPrice: product.old_price,
            stock: product.stock_quantity,
            stock_quantity: product.stock_quantity,
          },
        ],
    deposit: product.allow_deposit,
    attributes: product.attributes,
  };
}

export function mapProductSummary(product) {
  return {
    ...product,
    category: product.category.name,
    image: product.image_url || "/product-placeholder.svg",
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
    images: product.images.length
      ? product.images.map((image) => image.url)
      : ["/product-placeholder.svg"],
    variants: product.variants.length
      ? product.variants.map((variant) => ({
          ...variant,
          image: variant.image || "/product-placeholder.svg",
          oldPrice: variant.old_price,
          stock: variant.stock_quantity,
        }))
      : [
          {
            id: "default",
            label: "Mặc định",
            image: "/product-placeholder.svg",
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

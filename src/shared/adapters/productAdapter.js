export function getVariantImages(variants) {
  return [
    ...new Set(
      variants
        .map((variant) => variant.image)
        .filter((image) => image && image !== "/product-placeholder.svg"),
    ),
  ];
}

export function getProductVisibility(product) {
  const attr = product?.attributes?.find(
    (a) => a.name === "visibility" || a.name === "_visibility",
  );
  if (attr?.value) return attr.value;
  if (product?.visibility) return product.visibility;
  if (product?.is_active === false || product?.active === false)
    return "hidden";
  return "public";
}

export function mapProductSummary(product) {
  const visibility = getProductVisibility(product);
  return {
    ...product,
    category: product.category?.name || product.category,
    image: product.image_url || product.image || "/product-placeholder.svg",
    oldPrice: product.old_price ?? product.oldPrice,
    stock: product.stock_quantity ?? product.stock,
    featured: product.is_pinned ?? product.featured,
    visibility,
    variants: product.variants || [],
  };
}

export function mapProductDetail(product) {
  const visibility = getProductVisibility(product);
  return {
    ...mapProductSummary({
      ...product,
      image_url: product.images?.[0]?.url || product.image || "",
      old_price: product.old_price ?? product.oldPrice,
    }),
    visibility,
    images: product.images?.length
      ? product.images.map((image) =>
          typeof image === "string" ? image : image.url,
        )
      : ["/product-placeholder.svg"],
    variants: product.variants?.length
      ? product.variants.map((variant) => ({
          ...variant,
          image: variant.image || "/product-placeholder.svg",
          oldPrice: variant.old_price ?? variant.oldPrice,
          stock: variant.stock_quantity ?? variant.stock,
        }))
      : [
          {
            id: "default",
            label: "Mặc định",
            image: "/product-placeholder.svg",
            color: "",
            price: product.price,
            oldPrice: product.old_price ?? product.oldPrice,
            stock: product.stock_quantity ?? product.stock,
            stock_quantity: product.stock_quantity ?? product.stock,
          },
        ],
    deposit: product.allow_deposit ?? product.deposit,
    attributes: product.attributes || [],
  };
}

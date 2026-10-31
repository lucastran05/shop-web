export function shouldLoadFeatured(
  { scrollLeft, scrollWidth, clientWidth },
  cardWidth,
) {
  return (
    clientWidth > 0 &&
    scrollLeft + clientWidth * 2 + cardWidth >= scrollWidth - 1
  );
}

export function appendFeaturedProducts(existing, incoming) {
  return [
    ...new Map(
      [...existing, ...incoming].map((product) => [product.id, product]),
    ).values(),
  ];
}

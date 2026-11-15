// Hiệu ứng ảnh sản phẩm "bay" vào nút giỏ hàng trên header sau khi thêm thành công.
export function flyToCart(sourceImage) {
  const target = document.querySelector(".bt-cart");
  if (!sourceImage || !target || !sourceImage.animate) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const from = sourceImage.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const size = Math.min(from.width, from.height, 160);
  const ghost = sourceImage.cloneNode();
  Object.assign(ghost.style, {
    position: "fixed",
    left: from.left + from.width / 2 - size / 2 + "px",
    top: from.top + from.height / 2 - size / 2 + "px",
    width: size + "px",
    height: size + "px",
    objectFit: "cover",
    borderRadius: "50%",
    zIndex: 2000,
    pointerEvents: "none",
    boxShadow: "0 12px 30px -10px rgba(30,42,31,.5)",
  });
  ghost.removeAttribute("srcset");
  ghost.alt = "";
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        transform: `translate(${dx * 0.55}px, ${dy - 80}px) scale(0.55)`,
        opacity: 1,
        offset: 0.6,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.4 },
    ],
    { duration: 750, easing: "cubic-bezier(.5,0,.2,1)" },
  );
  animation.onfinish = () => {
    ghost.remove();
    target.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.12)" },
        { transform: "scale(1)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
  };
}

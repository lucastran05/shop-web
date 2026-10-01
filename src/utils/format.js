import i18n from "./i18n";
export const currentLocale = () =>
  i18n.resolvedLanguage === "en" ? "en-US" : "vi-VN";
export const money = (n) =>
  new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency: "VND",
  }).format(n);
export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
export function validTimeZone(zone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
export function formatDateTime(
  value,
  zone = getDeviceTimeZone(),
  locale = currentLocale(),
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: validTimeZone(zone) ? zone : "UTC",
  }).format(date);
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "../constants/translations/vi.json";
import en from "../constants/translations/en.json";
let language = "vi";
try {
  language = localStorage.getItem("abc-language") === "en" ? "en" : "vi";
} catch {
  /* Storage is optional. */
}
i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: language,
  fallbackLng: "vi",
  supportedLngs: ["vi", "en"],
  keySeparator: false,
  nsSeparator: false,
  initImmediate: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem("abc-language", lng);
  } catch {
    /* Ignore blocked storage. */
  }
  document.documentElement.lang = lng;
});
document.documentElement.lang = language;
export default i18n;

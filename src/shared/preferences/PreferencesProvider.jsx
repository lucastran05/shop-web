import { createContext, useState, useEffect } from "react";
import { getDeviceTimeZone, validTimeZone } from "../utils/format";
import { normalizeCatalogPreferences } from "./catalogPreferences";

export const PreferencesContext = createContext(null);
export function PreferencesProvider({ children }) {
  const [catalogPreferences, setCatalogPreferences] = useState(() => {
    try {
      return normalizeCatalogPreferences(
        JSON.parse(localStorage.getItem("abc-catalog-preferences")),
      );
    } catch {
      return normalizeCatalogPreferences(null);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "abc-catalog-preferences",
        JSON.stringify(catalogPreferences),
      );
    } catch {
      /* optional persistence */
    }
  }, [catalogPreferences]);
  const [timeZone, setZone] = useState(() => {
    try {
      const stored = localStorage.getItem("abc-time-zone");
      return stored && validTimeZone(stored) ? stored : getDeviceTimeZone();
    } catch {
      return getDeviceTimeZone();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("abc-time-zone", timeZone);
    } catch {
      /* optional persistence */
    }
  }, [timeZone]);
  const setTimeZone = (zone) => {
    if (validTimeZone(zone)) setZone(zone);
  };
  return (
    <PreferencesContext.Provider
      value={{
        timeZone,
        setTimeZone,
        catalogPreferences,
        setCatalogPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

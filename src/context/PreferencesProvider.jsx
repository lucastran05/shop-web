import { useState, useEffect } from "react";
import { PreferencesContext } from "./preferences";
import { getDeviceTimeZone, validTimeZone } from "../utils/format";
export function PreferencesProvider({ children }) {
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
    <PreferencesContext.Provider value={{ timeZone, setTimeZone }}>
      {children}
    </PreferencesContext.Provider>
  );
}

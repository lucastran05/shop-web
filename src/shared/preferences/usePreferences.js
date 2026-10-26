import { useContext } from "react";
import { PreferencesContext } from "./preferences";
export const usePreferences = () => useContext(PreferencesContext);

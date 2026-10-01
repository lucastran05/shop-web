import { useContext } from "react";
import { PreferencesContext } from "../context/preferences";
export const usePreferences = () => useContext(PreferencesContext);

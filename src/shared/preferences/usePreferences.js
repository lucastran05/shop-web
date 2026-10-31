import { useContext } from "react";
import { PreferencesContext } from "./PreferencesProvider";
export const usePreferences = () => useContext(PreferencesContext);

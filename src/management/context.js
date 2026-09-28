import { createContext, useContext } from "react";
export const ManagementContext = createContext(null);
export const useManagement = () => useContext(ManagementContext);

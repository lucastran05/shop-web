import { useContext } from "react";
import { ManagementContext } from "../context/ManagementContext";
export const useManagement = () => useContext(ManagementContext);

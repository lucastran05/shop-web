import { useContext } from "react";
import { ManagementContext } from "../context/management";
export const useManagement = () => useContext(ManagementContext);

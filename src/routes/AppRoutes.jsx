import { Route, Routes } from "react-router-dom";
import CustomerRoutes from "./CustomerRoutes";
import ManagementRoutes from "./ManagementRoutes";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/management/*" element={<ManagementRoutes />} />
      <Route path="*" element={<CustomerRoutes />} />
    </Routes>
  );
}

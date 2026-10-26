import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spin } from "antd";
const CustomerRoutes = lazy(
  () => import("../../features/customer/routes/CustomerRoutes"),
);
const ManagementRoutes = lazy(
  () => import("../../features/management/routes/ManagementRoutes"),
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<Spin fullscreen />}>
      <Routes>
        <Route path="/management/*" element={<ManagementRoutes />} />
        <Route path="*" element={<CustomerRoutes />} />
      </Routes>
    </Suspense>
  );
}

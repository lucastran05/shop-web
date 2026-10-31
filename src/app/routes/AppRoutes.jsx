import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import PageLoading from "../../shared/components/PageLoading";
const CustomerRoutes = lazy(
  () => import("../../features/customer/routes/CustomerRoutes"),
);
const ManagementRoutes = lazy(
  () => import("../../features/management/routes/ManagementRoutes"),
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/management/*" element={<ManagementRoutes />} />
        <Route path="*" element={<CustomerRoutes />} />
      </Routes>
    </Suspense>
  );
}

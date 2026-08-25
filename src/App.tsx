import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireRole } from '@/lib/auth';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import AssetDetail from '@/pages/AssetDetail';
import WorkOrders from '@/pages/WorkOrders';
import AuditPage from '@/pages/AuditPage';
import ITSoftwarePage from '@/pages/ITSoftwarePage';
import Maintenance from '@/pages/Maintenance';
import Documentation from '@/pages/Documentation';
import DocumentDetail from '@/pages/DocumentDetail';
import QRCodePage from '@/pages/QRCodePage';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="inventario/:id" element={<AssetDetail />} />
            <Route path="ordens-servico" element={<WorkOrders />} />
            <Route path="auditoria-campo" element={<AuditPage />} />
            <Route path="ti-software" element={<ITSoftwarePage />} />
            <Route path="manutencao" element={<Maintenance />} />
            <Route path="documentacao" element={<Documentation />} />
            <Route path="documentacao/:slug" element={<DocumentDetail />} />
            <Route path="qr-code" element={<QRCodePage />} />
            <Route path="relatorios" element={<Reports />} />
            <Route
              path="configuracoes"
              element={
                <RequireRole roles={['admin']}>
                  <Settings />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

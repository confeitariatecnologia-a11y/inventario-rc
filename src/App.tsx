import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import AssetDetail from '@/pages/AssetDetail';
import Maintenance from '@/pages/Maintenance';
import Documentation from '@/pages/Documentation';
import DocumentDetail from '@/pages/DocumentDetail';
import QRCodePage from '@/pages/QRCodePage';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="inventario/:id" element={<AssetDetail />} />
          <Route path="manutencao" element={<Maintenance />} />
          <Route path="documentacao" element={<Documentation />} />
          <Route path="documentacao/:slug" element={<DocumentDetail />} />
          <Route path="qr-code" element={<QRCodePage />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

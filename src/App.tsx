import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';

const ScanPage = lazy(() => import('@/pages/ScanPage').then((m) => ({ default: m.ScanPage })));
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

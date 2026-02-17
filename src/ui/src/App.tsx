import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewBrand from './pages/NewBrand';
import BrandDetail from './pages/BrandDetail';
import GenerateDocument from './pages/GenerateDocument';
import DocumentDetail from './pages/DocumentDetail';
import Logs from './pages/Logs';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/brands/new" element={<NewBrand />} />
        <Route path="/brands/:slug" element={<BrandDetail />} />
        <Route path="/brands/:slug/documents/new" element={<GenerateDocument />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </Layout>
  );
}

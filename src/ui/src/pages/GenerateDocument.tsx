import { useParams } from 'react-router-dom';
import { useBrand } from '../hooks/useBrand';
import DocumentGenerator from '../components/DocumentGenerator';

export default function GenerateDocument() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, loading } = useBrand(slug);

  if (loading) return <p>Loading...</p>;
  if (!brand) return <p>Brand not found</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>Generate Document</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Brand: {brand.name}</p>
      <DocumentGenerator brandSlug={brand.slug} />
    </div>
  );
}

import { api } from '../api/client';

export default function DesignSystemPreview({ brandSlug, assetType }: { brandSlug: string; assetType: string }) {
  const url = api.getAssetUrl(brandSlug, assetType);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
      <iframe
        src={url}
        title={assetType}
        style={{ width: '100%', height: 500, border: 'none' }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

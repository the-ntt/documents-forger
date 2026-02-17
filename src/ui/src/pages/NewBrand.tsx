import BrandOnboardingForm from '../components/BrandOnboardingForm';

export default function NewBrand() {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Create New Brand</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Provide a website URL or upload brand guidelines. Our AI will extract the complete design system — colors, fonts, spacing, and more.
        </p>
      </div>
      <BrandOnboardingForm />
    </div>
  );
}

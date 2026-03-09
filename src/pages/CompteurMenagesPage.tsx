import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { CompteurMenages } from '../components/taches/CompteurMenages';

export function CompteurMenagesPage() {
  return (
    <Layout>
      <PageHeader title="🧹 Compteur ménages" showBack />
      <div className="mt-4">
        <CompteurMenages />
      </div>
    </Layout>
  );
}

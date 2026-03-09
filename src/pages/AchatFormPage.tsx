import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { AchatForm } from '../components/achats/AchatForm';
import { useAchatStore } from '../stores/achatStore';

export function AchatFormPage() {
  const navigate = useNavigate();
  const { createAchat } = useAchatStore();

  return (
    <Layout>
      <PageHeader title="Nouvel achat" showBack />
      <div className="mt-4">
        <AchatForm
          onSubmit={async (data) => {
            await createAchat(data);
            navigate('/achats');
          }}
        />
      </div>
    </Layout>
  );
}

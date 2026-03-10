import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { ReservationForm } from '../components/reservations/ReservationForm';
import { useReservationStore } from '../stores/reservationStore';

export function ReservationFormPage() {
  const navigate = useNavigate();
  const { createReservation } = useReservationStore();

  return (
    <Layout>
      <PageHeader title="Nouvelle réservation" showBack />
      <div className="mt-4">
        <ReservationForm
          onSubmit={async (data) => {
            const reservation = await createReservation(data);
            navigate(`/reservations/${reservation.id}`);
          }}
        />
      </div>
    </Layout>
  );
}

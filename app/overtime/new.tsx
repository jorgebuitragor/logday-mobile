import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OvertimeForm } from '../../src/components/OvertimeForm';
import { createOvertimeEntry, type OvertimeInput } from '../../src/db/overtime';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewOvertimeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  async function handleSubmit(input: OvertimeInput) {
    await createOvertimeEntry(input);
    router.back();
  }

  return (
    <OvertimeForm
      initialValue={{ fecha: todayISO(), horaInicio: '18:00', horaFinal: '20:00', solicitadaPor: '', actividad: '', observaciones: 'pay' }}
      onSubmit={handleSubmit}
      submitLabel={t('overtimeForm.createSubmit')}
    />
  );
}

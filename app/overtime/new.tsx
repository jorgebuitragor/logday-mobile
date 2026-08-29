import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OvertimeForm } from '../../src/components/OvertimeForm';
import { createOvertimeEntry, type OvertimeInput } from '../../src/db/overtime';
import { todayISO } from '../../src/lib/dates';

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

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { NoteForm } from '../../src/components/NoteForm';
import { createNote, type NoteInput } from '../../src/db/notes';

export default function NewNoteScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  async function handleSubmit(input: NoteInput) {
    await createNote(input);
    router.back();
  }

  return <NoteForm onSubmit={handleSubmit} submitLabel={t('noteForm.createSubmit')} />;
}

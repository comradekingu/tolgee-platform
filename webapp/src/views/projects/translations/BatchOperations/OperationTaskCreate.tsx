import { useState } from 'react';
import { useProject } from 'tg.hooks/useProject';
import { TaskCreateDialog } from 'tg.component/task/taskCreate/TaskCreateDialog';

import { OperationProps } from './types';
import { BatchOperationsSubmit } from './components/BatchOperationsSubmit';
import { OperationContainer } from './components/OperationContainer';
import { useTranslationsSelector } from '../context/TranslationsContext';
import { getPreselectedLanguagesIds } from './getPreselectedLanguages';
import { User } from 'tg.component/UserAccount';

type Props = OperationProps;

export const OperationTaskCreate = ({ disabled, onFinished }: Props) => {
  const project = useProject();
  const [dialogOpen, setDialogOpen] = useState(true);

  const allLanguages = useTranslationsSelector((c) => c.languages) ?? [];
  const languagesWithoutBase = allLanguages.filter((l) => !l.base);
  const selection = useTranslationsSelector((c) => c.selection);
  const translationsLanguages = useTranslationsSelector(
    (c) => c.translationsLanguages
  );

  const languageAssignees = {} as Record<number, User[]>;
  getPreselectedLanguagesIds(
    languagesWithoutBase,
    translationsLanguages ?? []
  ).forEach((langId) => {
    languageAssignees[langId] = [];
  });

  return (
    <OperationContainer>
      <BatchOperationsSubmit
        disabled={disabled}
        onClick={() => setDialogOpen(true)}
      />
      <TaskCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialValues={{
          selection,
          languageAssignees,
          languages: languagesWithoutBase.map((l) => l.id),
        }}
        allLanguages={allLanguages}
        project={project}
        onFinished={onFinished}
      />
    </OperationContainer>
  );
};

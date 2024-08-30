import {
  useFinishTask,
  usePutTaskTranslation,
} from 'tg.service/TranslationHooks';
import { useProject } from 'tg.hooks/useProject';

import { SetTaskTranslationState, UpdateTask } from '../types';
import { useTranslationsService } from './useTranslationsService';
import { confirmation } from 'tg.hooks/confirmation';
import { T } from '@tolgee/react';

type Props = {
  translations: ReturnType<typeof useTranslationsService>;
};

export const useTaskService = ({ translations }: Props) => {
  const project = useProject();
  const finishTask = useFinishTask();
  const putTaskTranslation = usePutTaskTranslation();

  const handleFinishTask = ({ taskNumber, data }: UpdateTask) => {
    return finishTask.mutateAsync({
      path: { projectId: project.id, taskNumber: taskNumber },
    });
  };

  const setTaskTranslationState = (data: SetTaskTranslationState) =>
    putTaskTranslation.mutateAsync(
      {
        path: {
          projectId: project.id,
          taskNumber: data.taskNumber,
          keyId: data.keyId,
        },
        content: {
          'application/json': {
            done: data.done,
          },
        },
      },
      {
        onSuccess(response) {
          const key = translations.fixedTranslations?.find(
            (t) => t.keyId === data.keyId
          );
          translations.updateTranslationKeys([
            {
              keyId: data.keyId,
              value: {
                tasks: key?.tasks?.map((t) =>
                  t.number === data.taskNumber
                    ? { ...t, done: response.done }
                    : t
                ),
              },
            },
          ]);
          if (response.taskFinished) {
            confirmation({
              title: <T keyName="task_finished_confirmation_title" />,
              message: <T keyName="task_finished_confirmation_message" />,
              confirmButtonText: (
                <T keyName="task_finished_confirmation_confirm" />
              ),
              onConfirm() {
                handleFinishTask({
                  taskNumber: data.taskNumber,
                  data: { state: 'DONE' },
                }).then(() => {
                  translations.refetchTranslations();
                });
              },
            });
          }
        },
      }
    );

  return {
    setTaskTranslationState,
    isLoading: putTaskTranslation.isLoading || finishTask.isLoading,
  };
};

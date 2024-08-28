import { useEffect, useState } from 'react';
import { useTranslate } from '@tolgee/react';

import { useApiMutation, useApiQuery } from 'tg.service/http/useQueryApi';
import { useProject } from 'tg.hooks/useProject';

import { useTranslationsSelector } from '../context/TranslationsContext';
import { OperationContainer } from './components/OperationContainer';
import { BatchOperationsSubmit } from './components/BatchOperationsSubmit';
import { OperationProps } from './types';
import { messageService } from 'tg.service/MessageService';
import { TaskSearchSelect } from 'tg.component/task/taskSelect/TaskSearchSelect';
import { Task } from 'tg.component/task/taskSelect/types';

type Props = OperationProps;

export const OperationTaskRemoveKeys = ({ disabled, onFinished }: Props) => {
  const filteredTask = useTranslationsSelector((c) => c.prefilter?.task);
  const [task, setTask] = useState<Task | null>(null);
  const project = useProject();
  const { t } = useTranslate();

  const taskLoadable = useApiQuery({
    url: '/v2/projects/{projectId}/tasks/{taskId}',
    method: 'get',
    path: { projectId: project.id, taskId: filteredTask! },
    options: {
      enabled: typeof filteredTask === 'number',
      onSuccess(data) {
        setTask(data);
      },
      refetchOnMount: false,
    },
  });

  useEffect(() => {
    if (taskLoadable.data) {
      setTask((task) => task ?? taskLoadable.data);
    }
  }, [taskLoadable.data]);

  const selection = useTranslationsSelector((c) => c.selection);

  const addTaskKeysLoadable = useApiMutation({
    url: '/v2/projects/{projectId}/tasks/{taskId}/keys',
    method: 'put',
  });

  function handleAddKeys() {
    addTaskKeysLoadable.mutate(
      {
        path: { projectId: project.id, taskId: task!.id },
        content: { 'application/json': { removeKeys: selection } },
      },
      {
        onSuccess() {
          messageService.success(
            t('batch_operations_remove_task_keys_success')
          );
          onFinished();
        },
      }
    );
  }

  return (
    <OperationContainer>
      <TaskSearchSelect
        label={null}
        value={task}
        onChange={(value) => setTask(value)}
        project={project}
        sx={{ width: 280 }}
      />
      <BatchOperationsSubmit
        disabled={disabled}
        onClick={handleAddKeys}
        loading={addTaskKeysLoadable.isLoading}
      />
    </OperationContainer>
  );
};

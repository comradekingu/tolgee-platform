import React from 'react';
import { Box } from '@mui/material';
import { T } from '@tolgee/react';

import { useApiQuery } from 'tg.service/http/useQueryApi';
import { LoadingSkeleton } from 'tg.component/LoadingSkeleton';
import { useLoadingRegister } from 'tg.component/GlobalLoading';
import { stopAndPrevent } from 'tg.fixtures/eventHandler';
import { components } from 'tg.service/apiSchema.generated';
import { TaskLabel } from './TaskLabel';

type TaskModel = components['schemas']['TaskModel'];

type Props = {
  taskId: number;
  projectId: number;
  actions?: React.ReactNode | ((task: TaskModel) => React.ReactNode);
};

export const TaskTooltipContent = ({ projectId, taskId, actions }: Props) => {
  const task = useApiQuery({
    url: '/v2/projects/{projectId}/tasks/{taskId}',
    method: 'get',
    path: {
      projectId,
      taskId,
    },
    fetchOptions: {
      disableAuthRedirect: true,
    },
  });

  useLoadingRegister(task.isFetching);

  const assignees = task.data?.assignees ?? [];

  return (
    <Box sx={{ padding: 1 }} onClick={stopAndPrevent()}>
      {task.isLoading && <LoadingSkeleton sx={{ height: 24, width: 150 }} />}
      {task.error?.code === 'operation_not_permitted' && (
        <Box>
          <T keyName="task_tooltip_content_no_access" />
        </Box>
      )}
      {task.data && (
        <Box sx={{ display: 'grid', gap: 1, justifyItems: 'start' }}>
          <TaskLabel task={task.data} />
          <Box>
            {assignees.length ? (
              <>
                <T keyName="task_tooltip_content_assignees" />{' '}
                {(assignees[0].name ?? '') +
                  (assignees.length > 1 ? ` (+${assignees.length - 1})` : '')}
              </>
            ) : (
              <T keyName="task_tooltip_content_no_assignees" />
            )}
          </Box>
          {actions && (
            <Box sx={{ display: 'flex', gap: 1 }} onClick={stopAndPrevent()}>
              {typeof actions === 'function' ? actions(task.data) : actions}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

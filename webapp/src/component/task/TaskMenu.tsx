import { useState } from 'react';
import { Divider, Menu, MenuItem, useTheme } from '@mui/material';
import { T, useTranslate } from '@tolgee/react';
import { Link } from 'react-router-dom';

import { confirmation } from 'tg.hooks/confirmation';
import { components } from 'tg.service/apiSchema.generated';
import { Scope } from 'tg.fixtures/permissions';
import { messageService } from 'tg.service/MessageService';
import { useApiMutation, useApiQuery } from 'tg.service/http/useQueryApi';

import { getLinkToTask, useTaskReport } from './utils';
import { InitialValues, TaskCreateDialog } from './taskCreate/TaskCreateDialog';
import { useUser } from 'tg.globalContext/helpers';

type TaskModel = components['schemas']['TaskModel'];
type SimpleProjectModel = components['schemas']['SimpleProjectModel'];

type Props = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onDetailOpen: (task: TaskModel) => void;
  task: TaskModel;
  project: SimpleProjectModel;
  projectScopes?: Scope[];
};

export const TaskMenu = ({
  anchorEl,
  onClose,
  task,
  onDetailOpen,
  project,
  projectScopes,
}: Props) => {
  const user = useUser();
  const isOpen = Boolean(anchorEl);
  const [taskCreate, setTaskCreate] = useState<Partial<InitialValues>>();
  const updateMutation = useApiMutation({
    url: '/v2/projects/{projectId}/tasks/{taskId}',
    method: 'put',
    invalidatePrefix: ['/v2/projects/{projectId}/tasks', '/v2/user-tasks'],
  });

  const finishMutation = useApiMutation({
    url: '/v2/projects/{projectId}/tasks/{taskId}/finish',
    method: 'post',
    invalidatePrefix: ['/v2/projects/{projectId}/tasks', '/v2/user-tasks'],
  });

  const { downloadReport } = useTaskReport();

  const projectLoadable = useApiQuery({
    url: '/v2/projects/{projectId}',
    method: 'get',
    path: { projectId: project.id },
    options: {
      enabled: !projectScopes && isOpen,
      refetchOnMount: false,
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  });

  const scopes =
    projectScopes ?? projectLoadable.data?.computedPermission.scopes ?? [];

  const canEditTask = scopes?.includes('tasks.edit');
  const canMarkAsDone =
    scopes.includes('tasks.edit') ||
    Boolean(task.assignees.find((u) => u.id === user?.id));

  const languagesLoadable = useApiQuery({
    url: '/v2/projects/{projectId}/languages',
    method: 'get',
    path: { projectId: project.id },
    query: {
      page: 0,
      size: 1000,
      sort: ['tag'],
    },
    options: {
      enabled: Boolean(taskCreate),
    },
  });

  const taskKeysMutation = useApiMutation({
    url: '/v2/projects/{projectId}/tasks/{taskId}/keys',
    method: 'get',
  });

  function handleClose() {
    confirmation({
      title: <T keyName="task_menu_close_confirmation_title" />,
      onConfirm() {
        onClose();
        updateMutation.mutate(
          {
            path: { projectId: project.id, taskId: task.id },
            content: { 'application/json': { state: 'CLOSED' } },
          },
          {
            onSuccess() {
              messageService.success(<T keyName="task_menu_close_success" />);
            },
          }
        );
      },
    });
  }

  function handleChangeState(state: TaskModel['state']) {
    updateMutation.mutate(
      {
        path: { projectId: project.id, taskId: task.id },
        content: { 'application/json': { state } },
      },
      {
        onSuccess() {
          onClose();
          messageService.success(
            <T keyName="task_menu_state_changed_success" />
          );
        },
      }
    );
  }

  function handleMarkAsDone() {
    finishMutation.mutate(
      {
        path: { projectId: project.id, taskId: task.id },
      },
      {
        onSuccess() {
          onClose();
          messageService.success(
            <T keyName="task_menu_state_changed_success" />
          );
        },
      }
    );
  }

  function handleGetExcelReport() {
    onClose();
    downloadReport(project, task);
  }

  function handleCloneTask() {
    taskKeysMutation.mutate(
      {
        path: { projectId: project.id, taskId: task.id },
      },
      {
        onSuccess(data) {
          setTaskCreate({
            selection: data.keys,
            name: task.name,
            description: task.description,
            type: task.type,
          });
          onClose();
        },
      }
    );
  }

  function handleCreateReviewTask() {
    taskKeysMutation.mutate(
      {
        path: { projectId: project.id, taskId: task.id },
      },
      {
        onSuccess(data) {
          setTaskCreate({
            selection: data.keys,
            name: task.name,
            description: task.description,
            languages: [task.language.id],
            type: 'REVIEW',
          });
          onClose();
        },
      }
    );
  }

  const withClose = (func: () => void) => () => {
    func();
    onClose();
  };

  const { t } = useTranslate();
  const theme = useTheme();
  return (
    <>
      <Menu anchorEl={anchorEl} open={isOpen} onClose={onClose}>
        <MenuItem
          component={Link}
          to={getLinkToTask(project, task)}
          style={{
            textDecoration: 'none',
            color: theme.palette.text.primary,
            outline: 'none',
          }}
        >
          {t('task_menu_open_translations')}
        </MenuItem>
        <MenuItem onClick={withClose(() => onDetailOpen(task))}>
          {t('task_menu_task_detail')}
        </MenuItem>
        {task.state === 'IN_PROGRESS' ? (
          <MenuItem
            onClick={() => handleMarkAsDone()}
            disabled={task.doneItems !== task.totalItems || !canMarkAsDone}
          >
            {t('task_menu_mark_as_done')}
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => handleChangeState('IN_PROGRESS')}
            disabled={!canEditTask}
          >
            {t('task_menu_mark_as_in_progress')}
          </MenuItem>
        )}
        {task.state === 'IN_PROGRESS' && (
          <MenuItem disabled={!canEditTask} onClick={handleClose}>
            {t('task_menu_close_task')}
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleCloneTask} disabled={!canEditTask}>
          {t('task_menu_clone_task')}
        </MenuItem>
        {task.type === 'TRANSLATE' && (
          <MenuItem onClick={handleCreateReviewTask} disabled={!canEditTask}>
            {t('task_menu_create_review_task')}
          </MenuItem>
        )}

        <Divider />
        <MenuItem onClick={handleGetExcelReport}>
          {t('task_menu_generate_report')}
        </MenuItem>
      </Menu>
      {taskCreate && languagesLoadable.data && (
        <TaskCreateDialog
          open={true}
          onClose={() => setTaskCreate(undefined)}
          onFinished={() => setTaskCreate(undefined)}
          allLanguages={languagesLoadable.data._embedded?.languages ?? []}
          project={project}
          initialValues={taskCreate}
        />
      )}
    </>
  );
};

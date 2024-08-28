import { Button, Dialog, Tooltip } from '@mui/material';
import { TaskTooltipContent } from './TaskTooltipContent';
import { components } from 'tg.service/apiSchema.generated';
import { useState } from 'react';
import { TaskDetail } from './TaskDetail';
import { stopAndPrevent } from 'tg.fixtures/eventHandler';
import { Link } from 'react-router-dom';
import { getLinkToTask } from './utils';
import { T } from '@tolgee/react';

type TaskModel = components['schemas']['TaskModel'];
type SimpleProjectModel = components['schemas']['SimpleProjectModel'];

type Action = 'open' | 'detail';

type Props = {
  taskId: number;
  project: SimpleProjectModel;
  children: React.ReactElement<any, any>;
  actions?: Action[] | React.ReactNode | ((task: TaskModel) => React.ReactNode);
};

export const TaskTooltip = ({
  taskId,
  project,
  children,
  actions = ['open', 'detail'],
}: Props) => {
  const [taskDetailData, setTaskDetailData] = useState<TaskModel>();

  const actionsContent = Array.isArray(actions)
    ? (task: TaskModel) => (
        <>
          {actions.includes('open') && (
            <Button
              component={Link}
              to={getLinkToTask(project, task)}
              size="small"
            >
              <T keyName="task_tooltip_content_open" />
            </Button>
          )}
          {
            <Button size="small" onClick={() => setTaskDetailData(task)}>
              <T keyName="task_tooltip_content_detail" />
            </Button>
          }
        </>
      )
    : null;

  return (
    <>
      <Tooltip
        title={
          <TaskTooltipContent
            taskId={taskId}
            projectId={project.id}
            actions={actionsContent ?? actions}
          />
        }
      >
        {children}
      </Tooltip>
      {taskDetailData && (
        <Dialog
          open={true}
          onClose={() => setTaskDetailData(undefined)}
          maxWidth="xl"
          onClick={stopAndPrevent()}
        >
          <TaskDetail
            task={taskDetailData}
            onClose={() => setTaskDetailData(undefined)}
            projectId={project.id}
          />
        </Dialog>
      )}
    </>
  );
};

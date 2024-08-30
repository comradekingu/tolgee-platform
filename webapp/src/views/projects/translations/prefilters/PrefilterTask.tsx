import React, { useState } from 'react';
import { T } from '@tolgee/react';
import { Box, Dialog, IconButton, styled, useTheme } from '@mui/material';
import { AlertTriangle } from '@untitled-ui/icons-react';

import { useApiQuery } from 'tg.service/http/useQueryApi';
import { useProject } from 'tg.hooks/useProject';
import { TaskLabel } from 'tg.component/task/TaskLabel';
import { PrefilterContainer } from './ContainerPrefilter';
import { TaskDetail } from 'tg.component/task/TaskDetail';
import { TaskTooltip } from 'tg.component/task/TaskTooltip';
import { TaskDetail as TaskDetailIcon } from 'tg.component/CustomIcons';

const StyledWarning = styled('div')`
  display: flex;
  align-items: center;
  padding-left: 12px;
  gap: 4px;
`;

const StyledTaskId = styled('span')`
  text-decoration: underline;
  text-underline-offset: 3px;
`;

type Props = {
  taskNumber: number;
};

export const PrefilterTask = ({ taskNumber }: Props) => {
  const project = useProject();
  const theme = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  const { data } = useApiQuery({
    url: '/v2/projects/{projectId}/tasks/{taskNumber}',
    method: 'get',
    path: { projectId: project.id, taskNumber },
  });

  const blockingTasksLoadable = useApiQuery({
    url: '/v2/projects/{projectId}/tasks/{taskNumber}/blocking-tasks',
    method: 'get',
    path: { projectId: project.id, taskNumber },
  });

  if (!data) {
    return null;
  }

  function handleShowDetails() {
    setShowDetails(true);
  }
  function handleDetailClose() {
    setShowDetails(false);
  }
  return (
    <>
      <PrefilterContainer
        title={<T keyName="task_filter_indicator_label" />}
        content={
          <Box display="flex" gap={1}>
            <TaskLabel task={data} />
            <IconButton size="small" onClick={handleShowDetails}>
              <TaskDetailIcon width={20} height={20} />
            </IconButton>
            {blockingTasksLoadable.data?.length ? (
              <StyledWarning>
                <AlertTriangle
                  width={18}
                  height={18}
                  color={theme.palette.warning.main}
                />
                <Box>
                  <T keyName="task_filter_indicator_blocking_warning" />{' '}
                  {blockingTasksLoadable.data.map((taskNumber, i) => (
                    <React.Fragment key={taskNumber}>
                      <TaskTooltip taskNumber={taskNumber} project={project}>
                        <StyledTaskId>#{taskNumber}</StyledTaskId>
                      </TaskTooltip>
                      {i !== blockingTasksLoadable.data.length - 1 && ', '}
                    </React.Fragment>
                  ))}
                </Box>
              </StyledWarning>
            ) : null}
          </Box>
        }
      />
      {showDetails && (
        <Dialog open={true} onClose={handleDetailClose} maxWidth="xl">
          <TaskDetail
            task={data}
            onClose={handleDetailClose}
            projectId={project.id}
          />
        </Dialog>
      )}
    </>
  );
};

import { useState } from 'react';
import { T } from '@tolgee/react';
import { Box, Button, Dialog } from '@mui/material';

import { useApiQuery } from 'tg.service/http/useQueryApi';
import { useProject } from 'tg.hooks/useProject';
import { TaskLabel } from 'tg.component/task/TaskLabel';
import { PrefilterContainer } from './ContainerPrefilter';
import { TaskDetail } from 'tg.component/task/TaskDetail';

type Props = {
  taskId: number;
};

export const PrefilterTask = ({ taskId }: Props) => {
  const project = useProject();
  const [showDetails, setShowDetails] = useState(false);

  const { data } = useApiQuery({
    url: '/v2/projects/{projectId}/tasks/{taskId}',
    method: 'get',
    path: { projectId: project.id, taskId },
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
            <Button size="small" onClick={handleShowDetails}>
              <T keyName="task_filter_show_details" />
            </Button>
          </Box>
        }
      />
      {showDetails && (
        <Dialog open={true} onClose={handleDetailClose} maxWidth="xl">
          <TaskDetail
            task={data}
            onClose={handleDetailClose}
            project={project}
          />
        </Dialog>
      )}
    </>
  );
};

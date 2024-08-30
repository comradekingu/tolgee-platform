import React, { useEffect } from 'react';
import { Box, styled } from '@mui/material';
import { LoadingSkeletonFadingIn } from 'tg.component/LoadingSkeleton';

import { PanelContentData, PanelContentProps } from '../../common/types';
import { TabMessage } from '../../common/TabMessage';
import { useApiQuery } from 'tg.service/http/useQueryApi';
import { TaskLabel } from 'tg.component/task/TaskLabel';
import { TaskTooltip } from 'tg.component/task/TaskTooltip';

const StyledContainer = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: 4px;
`;

export const Tasks: React.FC<PanelContentProps> = ({
  keyData,
  language,
  setItemsCount,
  project,
}) => {
  const translation = keyData.translations[language.tag];
  const firstTask = keyData.tasks?.find((t) => t.languageId === language.id);
  const tasksLoadable = useApiQuery({
    url: '/v2/projects/{projectId}/tasks',
    method: 'get',
    path: { projectId: project.id },
    query: {
      filterKey: [keyData.keyId],
      filterLanguage: [language.id],
      filterState: ['IN_PROGRESS'],
      sort: ['type,desc', 'id,desc'],
    },
    options: {
      enabled: Boolean(translation),
    },
  });

  useEffect(() => {
    setItemsCount(tasksLoadable.data?._embedded?.tasks?.length);
  }, [tasksLoadable.data]);

  return (
    <StyledContainer>
      {tasksLoadable.data?._embedded?.tasks?.length ? (
        tasksLoadable.data._embedded.tasks.map((task) => (
          <TaskTooltip
            key={task.number}
            taskNumber={task.number}
            project={project}
            enterDelay={1000}
          >
            <Box>
              <TaskLabel
                task={task}
                sx={{
                  padding: 1,
                  opacity: task.number === firstTask?.number ? 1 : 0.6,
                }}
              />
            </Box>
          </TaskTooltip>
        ))
      ) : tasksLoadable.isLoading ? (
        <TabMessage>
          <LoadingSkeletonFadingIn variant="text" />
        </TabMessage>
      ) : null}
    </StyledContainer>
  );
};

export const tasksCount = ({ keyData, language }: PanelContentData) => {
  return keyData.tasks?.filter((t) => t.languageId === language.id)?.length ?? 0
    ? '...'
    : null;
};

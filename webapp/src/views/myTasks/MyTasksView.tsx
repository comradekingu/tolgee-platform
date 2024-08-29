import { useState } from 'react';
import { Home } from '@mui/icons-material';
import { Dialog, ListProps, PaperProps, styled } from '@mui/material';
import { useTranslate } from '@tolgee/react';

import { BaseView } from 'tg.component/layout/BaseView';
import { DashboardPage } from 'tg.component/layout/DashboardPage';
import { LINKS } from 'tg.constants/links';
import { useApiQuery } from 'tg.service/http/useQueryApi';
import { PaginatedHateoasList } from 'tg.component/common/list/PaginatedHateoasList';
import { TaskItem } from 'tg.component/task/TaskItem';
import { components } from 'tg.service/apiSchema.generated';
import { TaskDetail } from 'tg.component/task/TaskDetail';
import { MyTasksHeader } from './MyTasksHeader';
import { useUrlSearchState } from 'tg.hooks/useUrlSearchState';
import { TaskFilterType } from 'tg.component/task/taskFilter/TaskFilterPopover';
import { useGlobalActions } from 'tg.globalContext/GlobalContext';

type TaskWithProjectModel = components['schemas']['TaskWithProjectModel'];

const StyledSeparator = styled('div')`
  grid-column: 1 / -1;
  height: 1px;
  background: ${({ theme }) => theme.palette.tokens.divider};
`;

export const MyTasksView = () => {
  const { t } = useTranslate();
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TaskWithProjectModel>();
  const { setUserTasks } = useGlobalActions();

  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  const [projects, setProjects] = useUrlSearchState('project', {
    array: true,
  });
  const [types, setTypes] = useUrlSearchState('type', {
    array: true,
  });

  const filter: TaskFilterType = {
    projects: projects?.map((p) => Number(p)),
    types: types as any[],
  };

  function setFilter(val: TaskFilterType) {
    setProjects(val.projects?.map((p) => String(p)));
    setTypes(val.types?.map((l) => String(l)));
  }

  function handleDetailClose() {
    setDetail(undefined);
  }

  const tasksLoadable = useApiQuery({
    url: '/v2/user-tasks',
    method: 'get',
    query: {
      size: 20,
      page,
      search,
      sort: ['createdAt,desc'],
      filterState: showClosed ? undefined : ['IN_PROGRESS'],
      filterProject: filter.projects,
      filterType: filter.types,
    },
    options: {
      keepPreviousData: true,
      onSuccess(data) {
        if (
          !showClosed &&
          Object.values(filter).every((val) => !val?.length) &&
          !search
        ) {
          // update global notification (only if no filters are applied)
          setUserTasks(data.page?.totalElements ?? 0);
        }
      },
    },
  });

  return (
    <DashboardPage>
      <BaseView
        windowTitle={t('my_tasks_title')}
        title={t('my_tasks_title')}
        maxWidth={800}
        navigation={[
          [null, LINKS.ROOT.build(), <Home key={0} fontSize="small" />],
          [t('my_tasks_title'), LINKS.MY_TASKS.build()],
        ]}
      >
        <MyTasksHeader
          sx={{ mb: '20px', mt: '-12px' }}
          onSearchChange={setSearch}
          showClosed={showClosed}
          onShowClosedChange={setShowClosed}
          filter={filter}
          onFilterChange={setFilter}
        />
        <PaginatedHateoasList
          loadable={tasksLoadable}
          onPageChange={setPage}
          listComponentProps={
            {
              sx: {
                display: 'grid',
                gridTemplateColumns:
                  '1fr minmax(15%, max-content) minmax(27%, max-content) 45px minmax(10%, max-content) auto',
                alignItems: 'center',
              },
            } as ListProps
          }
          wrapperComponentProps={
            {
              sx: {
                border: 'none',
                background: 'none',
              },
            } as PaperProps
          }
          renderItem={(task) => (
            <TaskItem
              task={task}
              project={task.project}
              onDetailOpen={(task) => {
                setDetail(task as TaskWithProjectModel);
              }}
              showProject={true}
            />
          )}
          getKey={(task) => `${task.project?.id}.${task.id}`}
          itemSeparator={() => <StyledSeparator />}
        />
      </BaseView>
      {detail !== undefined && (
        <Dialog open={true} onClose={handleDetailClose} maxWidth="xl">
          <TaskDetail
            task={detail}
            onClose={handleDetailClose}
            projectId={detail.project.id}
          />
        </Dialog>
      )}
    </DashboardPage>
  );
};

import React, { useEffect, useState } from 'react';
import {
  MenuItem,
  Popover,
  Autocomplete,
  InputBase,
  Box,
  styled,
  Button,
} from '@mui/material';
import { useTranslate } from '@tolgee/react';
import { useDebounce } from 'use-debounce';

import { components } from 'tg.service/apiSchema.generated';
import { useApiInfiniteQuery } from 'tg.service/http/useQueryApi';
import { SpinnerProgress } from 'tg.component/SpinnerProgress';
import { TaskSearchSelectItem } from './TaskSearchSelectItem';
import { Task } from './types';

type SimpleProjectModel = components['schemas']['SimpleProjectModel'];

const USERS_SEARCH_TRESHOLD = 0;

const StyledInput = styled(InputBase)`
  padding: 5px 4px 3px 16px;
  flex-grow: 1;
`;

const StyledInputWrapper = styled(Box)`
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider1};
  padding-right: 4px;
`;

const StyledWrapper = styled('div')`
  display: grid;
`;

const StyledProgressContainer = styled('div')`
  display: flex;
  align-items: center;
  margin-left: -18px;
`;

function PopperComponent(props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { disablePortal, anchorEl, open, ...other } = props;
  return <Box {...other} style={{ width: '100%' }} />;
}

function PaperComponent(props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { disablePortal, anchorEl, open, ...other } = props;
  return <Box {...other} style={{ width: '100%' }} />;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (value: Task | null) => void;
  anchorEl: HTMLElement;
  selected: Task | null;
  ownedOnly?: boolean;
  project: SimpleProjectModel;
};

export const TaskSearchSelectPopover: React.FC<Props> = ({
  open,
  onClose,
  onSelect,
  anchorEl,
  selected,
  ownedOnly,
  project,
}) => {
  const [inputValue, setInputValue] = useState('');
  const { t } = useTranslate();
  const [search] = useDebounce(inputValue, 500);

  const query = {
    params: {
      filterCurrentUserOwner: Boolean(ownedOnly),
      search: search || undefined,
    },
    size: 20,
    sort: ['name'],
  };

  const usersLoadable = useApiInfiniteQuery({
    url: '/v2/projects/{projectId}/tasks',
    method: 'get',
    path: { projectId: project.id },
    query,
    options: {
      keepPreviousData: true,
      getNextPageParam: (lastPage) => {
        if (
          lastPage.page &&
          lastPage.page.number! < lastPage.page.totalPages! - 1
        ) {
          return {
            query: {
              ...query,
              page: lastPage.page!.number! + 1,
            },
            path: { projectId: project.id },
          };
        } else {
          return null;
        }
      },
    },
  });

  const items: Task[] = usersLoadable.data?.pages
    .flatMap((page) => page._embedded?.tasks)
    .filter(Boolean) as Task[];

  const [displaySearch, setDisplaySearch] = useState<boolean | undefined>(
    undefined
  );

  useEffect(() => {
    if (usersLoadable.data && displaySearch === undefined) {
      setDisplaySearch(
        usersLoadable.data.pages[0].page!.totalElements! > USERS_SEARCH_TRESHOLD
      );
    }
  }, [usersLoadable.data]);

  return (
    <>
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <StyledWrapper sx={{ minWidth: (anchorEl?.offsetWidth || 200) + 16 }}>
          <Autocomplete
            open
            filterOptions={(x) => x}
            loading={usersLoadable.isFetching}
            options={items || []}
            value={selected}
            inputValue={inputValue}
            onClose={(_, reason) => reason === 'escape' && onClose()}
            clearOnEscape={false}
            noOptionsText={t('global_nothing_found')}
            loadingText={t('global_loading_text')}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onInputChange={(_, value, reason) =>
              reason === 'input' && setInputValue(value)
            }
            getOptionLabel={(u) => u.name || ''}
            PopperComponent={PopperComponent}
            PaperComponent={PaperComponent}
            renderOption={(props, option) => (
              <React.Fragment key={option.id}>
                <MenuItem
                  {...props}
                  selected={option.id === selected?.id}
                  data-cy="task-select-item"
                >
                  <TaskSearchSelectItem data={option} />
                </MenuItem>
                {usersLoadable.hasNextPage &&
                  option.id === items![items!.length - 1].id && (
                    <Box display="flex" justifyContent="center" mt={0.5}>
                      <Button
                        size="small"
                        onClick={() => usersLoadable.fetchNextPage()}
                      >
                        {t('global_load_more')}
                      </Button>
                    </Box>
                  )}
              </React.Fragment>
            )}
            onChange={(_, newValue) => {
              onSelect(newValue);
            }}
            renderInput={(params) => (
              <StyledInputWrapper>
                <StyledInput
                  data-cy="task-select-search"
                  key={Number(open)}
                  sx={{ display: displaySearch ? undefined : 'none' }}
                  ref={params.InputProps.ref}
                  inputProps={params.inputProps}
                  autoFocus
                  placeholder={t('global_task_search')}
                  endAdornment={
                    usersLoadable.isFetching ? (
                      <StyledProgressContainer>
                        <SpinnerProgress size={18} data-cy="global-loading" />
                      </StyledProgressContainer>
                    ) : undefined
                  }
                />
              </StyledInputWrapper>
            )}
          />
        </StyledWrapper>
      </Popover>
    </>
  );
};
import { Dialog, styled, useTheme } from '@mui/material';
import { XClose, Flag02, ClipboardCheck } from '@untitled-ui/icons-react';
import { useTranslate } from '@tolgee/react';

import { components } from 'tg.service/apiSchema.generated';
import { useApiMutation } from 'tg.service/http/useQueryApi';
import { useProject } from 'tg.hooks/useProject';
import { AutoTranslationIcon } from 'tg.component/AutoTranslationIcon';
import {
  StyledImgWrapper,
  TranslationFlagIcon,
} from 'tg.component/TranslationFlagIcon';
import {
  useTranslationsActions,
  useTranslationsSelector,
} from '../context/TranslationsContext';
import { useState } from 'react';
import { TaskDetail } from 'tg.component/task/TaskDetail';
import { stopAndPrevent } from 'tg.fixtures/eventHandler';
import { TaskTooltip } from 'tg.component/task/TaskTooltip';

type KeyWithTranslationsModel =
  components['schemas']['KeyWithTranslationsModel'];
type TaskModel = components['schemas']['TaskModel'];

const StyledWrapper = styled('div')`
  display: flex;
  gap: 2px;
`;

const StyledClearButton = styled(XClose)`
  padding-left: 2px;
  width: 18px;
  height: 18px;
  display: none;
`;

const ActiveFlagCircle = styled(Flag02)`
  color: ${({ theme }) => theme.palette.primary.main};
`;

const StyledContainer = styled('div')`
  display: inline-flex;
  flex-grow: 0;
  align-items: center;
  height: 20px;
  border: 1px solid transparent;
  padding: 0px 4px;
  margin-left: -4px;
  border-radius: 10px;

  &:hover .clearButton {
    display: block;
  }
  &:hover {
    border: 1px solid ${({ theme }) => theme.palette.divider1};
    transition: all 0.1s;
  }
`;

type Props = {
  keyData: KeyWithTranslationsModel;
  lang: string;
  className?: string;
};

export const TranslationFlags: React.FC<Props> = ({
  keyData,
  lang,
  className,
}) => {
  const theme = useTheme();
  const project = useProject();
  const { t } = useTranslate();
  const translation = keyData.translations[lang];
  const task = keyData.tasks?.find((t) => t.languageTag === lang);
  const prefilteredTask = useTranslationsSelector((c) => c.prefilter?.task);
  const displayTaskFlag =
    task && (task.number !== prefilteredTask || !task.userAssigned);

  const { updateTranslation } = useTranslationsActions();
  const [taskDetailData, setTaskDetailData] = useState<TaskModel>();

  const clearAutoTranslatedState = useApiMutation({
    url: '/v2/projects/{projectId}/translations/{translationId}/dismiss-auto-translated-state',
    method: 'put',
  });

  const handleClearAutoTranslated = (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    e.stopPropagation();
    clearAutoTranslatedState
      .mutateAsync({
        path: { projectId: project.id, translationId: translation!.id },
      })
      .then(() => {
        updateTranslation({
          keyId: keyData.keyId,
          lang,
          data: { auto: false },
        });
      });
  };

  const clearOutdated = useApiMutation({
    url: '/v2/projects/{projectId}/translations/{translationId}/set-outdated-flag/{state}',
    method: 'put',
  });

  const handleClearOutdated = (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>
  ) => {
    e.stopPropagation();
    clearOutdated
      .mutateAsync({
        path: {
          projectId: project.id,
          translationId: translation!.id,
          state: false,
        },
      })
      .then(() => {
        updateTranslation({
          keyId: keyData.keyId,
          lang,
          data: { outdated: false },
        });
      });
  };

  if (translation?.auto || translation?.outdated || displayTaskFlag) {
    return (
      <StyledWrapper className={className}>
        {displayTaskFlag && (
          <StyledContainer data-cy="translations-outdated-indicator">
            <TaskTooltip taskNumber={task.number} project={project}>
              <StyledImgWrapper>
                <ClipboardCheck
                  color={
                    task?.done
                      ? theme.palette.secondary.main
                      : theme.palette.primary.main
                  }
                />
              </StyledImgWrapper>
            </TaskTooltip>
          </StyledContainer>
        )}
        {translation.auto && (
          <StyledContainer data-cy="translations-auto-translated-indicator">
            <AutoTranslationIcon provider={translation.mtProvider} />
            <StyledClearButton
              role="button"
              onClick={handleClearAutoTranslated}
              data-cy="translations-auto-translated-clear-button"
              className="clearButton"
            />
          </StyledContainer>
        )}
        {translation.outdated && (
          <StyledContainer data-cy="translations-outdated-indicator">
            <TranslationFlagIcon
              tooltip={t('translations_cell_outdated')}
              icon={<ActiveFlagCircle />}
            />
            <StyledClearButton
              role="button"
              onClick={handleClearOutdated}
              data-cy="translations-outdated-clear-button"
              className="clearButton"
            />
          </StyledContainer>
        )}
        {taskDetailData && task && (
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
      </StyledWrapper>
    );
  } else {
    return null;
  }
};

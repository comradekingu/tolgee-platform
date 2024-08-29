import React, { ComponentProps } from 'react';
import { SvgIcon } from '@mui/material';

import ExportSvg from '../svgs/icons/export.svg?react';
import TadaSvg from '../svgs/icons/tada.svg?react';
import RocketSvg from '../svgs/icons/rocket.svg?react';
import QSFinishedSvg from '../svgs/icons/qs-finished.svg?react';
import StarsSvg from '../svgs/icons/stars.svg?react';
import SlackSvg from '../svgs/icons/slack.svg?react';
export { default as DropzoneIcon } from '../svgs/icons/dropzone.svg?react';
export { default as TaskDetailIcon } from '../svgs/icons/taskDetail.svg?react';
export { default as IntegrationIcon } from '../svgs/icons/integration.svg?react';
export { default as CheckCircleDash } from '../svgs/icons/check-circle-dash.svg?react';
export { default as MtIcon } from '../svgs/icons/mt.svg?react';
export { default as TranslationMemoryIcon } from '../svgs/icons/translation-memory.svg?react';
export { default as ViewCards } from '../svgs/icons/view-cards.svg?react';
export { default as ViewList } from '../svgs/icons/view-list.svg?react';

type IconProps = ComponentProps<typeof SvgIcon>;

const CustomIcon: React.FC<IconProps & { icon: typeof ExportSvg }> = ({
  icon,
  ...props
}) => {
  const Icon = icon;
  return (
    <SvgIcon {...props}>
      <Icon fill="currentColor" />
    </SvgIcon>
  );
};

export const TadaIcon: React.FC<IconProps> = (props) => (
  <CustomIcon icon={TadaSvg} {...props} />
);
export const RocketIcon: React.FC<IconProps> = (props) => (
  <CustomIcon icon={RocketSvg} {...props} />
);

export const QSFinishedIcon: React.FC<IconProps> = (props) => (
  <CustomIcon icon={QSFinishedSvg} {...props} />
);

export const StarsIcon: React.FC<IconProps> = (props) => (
  <CustomIcon icon={StarsSvg} {...props} />
);

export const SlackIcon: React.FC<IconProps> = (props) => (
  <CustomIcon icon={SlackSvg} {...props} />
);

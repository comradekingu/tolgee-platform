import { Box, styled } from '@mui/material';
import { components } from 'tg.service/apiSchema.generated';
import { AvatarImg } from './common/avatar/AvatarImg';

export type Avatar = components['schemas']['Avatar'];

export type User = {
  id: number;
  username: string;
  name?: string;
  avatar?: Avatar;
};

const StyledOrgItem = styled('div')`
  display: flex;
  gap: 8px;
  align-items: center;
  text: ${({ theme }) => theme.palette.primaryText};
`;

type Props = {
  user: User;
};

export const UserAccount = ({ user }: Props) => {
  return (
    <StyledOrgItem>
      <Box>
        <AvatarImg
          key={0}
          owner={{
            name: user.name,
            avatar: user.avatar,
            type: 'USER',
            id: user.id,
          }}
          size={22}
        />
      </Box>
      <Box>{user.name}</Box>
    </StyledOrgItem>
  );
};

import { FC, useMemo, useState } from 'react';
import { Box, Slider, styled } from '@mui/material';
import { useTranslate } from '@tolgee/react';

import {
  useBillingApiMutation,
  useBillingApiQuery,
} from 'tg.service/http/useQueryApi';
import { useOrganization } from 'tg.views/organizations/useOrganization';
import LoadingButton from 'tg.component/common/form/LoadingButton';
import { getPossibleValues } from './creditsUtil';
import { BillingSection } from '../BillingSection';
import { useMoneyFormatter, useNumberFormatter } from 'tg.hooks/useLocale';

const StyledContainer = styled('div')`
  display: grid;
  gap: 10px;
`;

const StyledSliderWrapper = styled('div')`
  display: grid;
`;

const StyledBottomRow = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`;

const StyledPrice = styled('div')`
  display: grid;
`;

const StyledAmount = styled('div')`
  font-size: 18px;
  color: ${({ theme }) => theme.palette.primary.main};
`;

const StyledFullAmount = styled('div')`
  font-size: 13px;
  text-decoration: line-through;
  height: 20px;
`;

export const Credits: FC = () => {
  const organization = useOrganization();

  const pricesLoadable = useBillingApiQuery({
    url: '/v2/billing/mt-credit-prices',
    method: 'get',
  });

  const buyMutation = useBillingApiMutation({
    url: `/v2/organizations/{organizationId}/billing/buy-more-credits`,
    method: 'post',
    options: {
      onSuccess(data) {
        window.location.href = data;
      },
    },
  });

  const t = useTranslate();

  const buy = (priceId: number, amount: number) => {
    buyMutation.mutate({
      path: {
        organizationId: organization!.id,
      },
      content: {
        'application/json': {
          priceId: priceId,
          amount: amount,
        },
      },
    });
  };

  const [sliderValue, setSliderValue] = useState(1 as number);

  const sliderPossibleValues = useMemo(() => {
    const prices = pricesLoadable?.data?._embedded?.prices;
    if (!prices) {
      return null;
    }
    return getPossibleValues(prices);
  }, [pricesLoadable?.data?._embedded?.prices]);

  const formatValue = (value) =>
    t({
      key: 'billing_buy_more_mt_slider_value',
      defaultValue: '{amount} Credits',
      parameters: { amount: value },
    });

  const formatPrice = useMoneyFormatter();
  const formatNumber = useNumberFormatter();

  if (!sliderPossibleValues) {
    return null;
  }

  const { totalPrice, regularPrice, totalAmount, priceId, itemQuantity } =
    sliderPossibleValues?.[sliderValue];

  return (
    <BillingSection title={t('billing_extra_credits_title')}>
      <StyledContainer>
        <StyledSliderWrapper>
          <Slider
            value={sliderValue}
            min={0}
            step={1}
            max={sliderPossibleValues.length - 1}
            scale={(value) => sliderPossibleValues[value].totalAmount}
            getAriaValueText={formatValue}
            onChange={(_, value) => setSliderValue(value as number)}
            aria-labelledby="non-linear-slider"
          />
          <Box marginTop="-4px">{formatNumber(totalAmount)}</Box>
        </StyledSliderWrapper>
        <StyledBottomRow>
          <StyledPrice>
            <StyledAmount>{formatPrice(totalPrice)}</StyledAmount>
            <StyledFullAmount>
              {regularPrice !== undefined && formatPrice(regularPrice)}
            </StyledFullAmount>
          </StyledPrice>
          <Box>
            <LoadingButton
              variant="contained"
              color="primary"
              size="small"
              onClick={() => buy(priceId, itemQuantity)}
              loading={buyMutation.isLoading}
            >
              {t('billing_extra_credits_buy')}
            </LoadingButton>
          </Box>
        </StyledBottomRow>
      </StyledContainer>
    </BillingSection>
  );
};
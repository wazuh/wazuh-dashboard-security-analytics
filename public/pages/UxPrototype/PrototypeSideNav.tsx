/*
 * PROTOTYPE — throwaway. The plugin's own side nav, rebuilt for the prototype route.
 * Variant C hoists the pipeline into this rail; A and B leave the rail alone so the
 * three variants can be compared with the same navigation underneath them.
 */

import React from 'react';
import { EuiSideNav, EuiSideNavItemType } from '@elastic/eui';
import { History } from 'history';
import { StageId } from './mockData';
import { StageLeftRail } from './StageControl';
import { buildSearch, parseState, ScreenId } from './prototypeState';

interface Props {
  history: History;
  pathname: string;
  search: string;
}

export const PrototypeSideNav: React.FC<Props> = ({ history, pathname, search }) => {
  const state = parseState(search);

  const go = (patch: Partial<typeof state>) =>
    history.replace(`${pathname}${buildSearch({ ...state, ...patch })}`);

  const item = (name: string, screen: ScreenId): EuiSideNavItemType<{}> => ({
    id: screen,
    name,
    onClick: () => go({ screen }),
    isSelected: state.screen === screen,
  });

  const disabled = (name: string): EuiSideNavItemType<{}> => ({
    id: name,
    name,
    disabled: true,
    onClick: () => undefined,
  });

  const items: Array<EuiSideNavItemType<{}>> = [
    {
      name: 'Security Analytics',
      id: 'sa',
      items: [
        item('Overview', 'overview'),
        {
          name: 'Normalization',
          id: 'normalization',
          forceOpen: true,
          items: [item('Decoders', 'decoders'), disabled('KVDBs'), disabled('Filters')],
        },
        {
          name: 'Detection',
          id: 'detection',
          forceOpen: true,
          items: [disabled('Detectors'), disabled('Rules')],
        },
        item('Log test', 'logtest'),
      ],
    },
  ];

  return (
    <>
      {state.variant === 'C' && (
        <StageLeftRail
          stage={state.stage}
          onStageChange={(stage: StageId) => go({ stage })}
          onReview={() => go({ screen: 'promote' })}
        />
      )}
      <EuiSideNav style={{ width: 200 }} items={items} />
    </>
  );
};

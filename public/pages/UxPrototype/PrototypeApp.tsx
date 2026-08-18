/*
 * PROTOTYPE — throwaway. Hosts the four review screens on one route and swaps the
 * R1 stage control between three structurally different homes via ?variant=.
 * All state lives in the URL, so any view is shareable and reload-stable — which is
 * itself one of the review's recommendations (F1.4).
 *
 * The stage control is handed to each screen as `scopeBar` rather than rendered
 * above it, so the page title always comes first: identity, then scope, then content.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { AppMountParameters } from 'opensearch-dashboards/public';
import { EuiSpacer } from '@elastic/eui';
import { MountPointPortal } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { StageId } from './mockData';
import { PrototypeSwitcher } from './PrototypeSwitcher';
import { StageContextStrip, StageHeaderPill, StageRibbon } from './StageControl';
import { buildSearch, parseState, ScreenId, VariantId } from './prototypeState';
import { OverviewScreen } from './screens/OverviewScreen';
import { DecodersScreen } from './screens/DecodersScreen';
import { LogTestScreen } from './screens/LogTestScreen';
import { PromoteScreen } from './screens/PromoteScreen';

interface Props extends RouteComponentProps {
  setActionMenu?: AppMountParameters['setHeaderActionMenu'];
}

export const PrototypeApp: React.FC<Props> = ({ history, location, setActionMenu }) => {
  const state = parseState(location.search);

  const update = (patch: Partial<typeof state>) =>
    history.replace(`${location.pathname}${buildSearch({ ...state, ...patch })}`);

  const onStageChange = (stage: StageId) => update({ stage });
  const onNavigate = (screen: ScreenId) => update({ screen });
  const onVariantChange = (variant: VariantId) => update({ variant });

  const controlProps = {
    stage: state.stage,
    onStageChange,
    onReview: () => onNavigate('promote'),
  };

  const contextOnly = (
    <>
      <EuiSpacer size="s" />
      <StageContextStrip stage={state.stage} />
    </>
  );

  /* A puts the whole pipeline in the page; B and C carry it elsewhere, so the page
     keeps only the sentence that says which stage you are working in. */
  const scopeBar =
    state.variant === 'A' ? (
      <>
        <EuiSpacer size="m" />
        <StageRibbon {...controlProps} />
      </>
    ) : (
      <>
        <EuiSpacer size="s" />
        <StageContextStrip stage={state.stage} />
      </>
    );

  const screen = (() => {
    switch (state.screen) {
      case 'decoders':
        return (
          <DecodersScreen stage={state.stage} onStageChange={onStageChange} scopeBar={scopeBar} />
        );
      case 'logtest':
        return (
          <LogTestScreen stage={state.stage} onStageChange={onStageChange} scopeBar={scopeBar} />
        );
      case 'promote':
        return <PromoteScreen onDone={() => onNavigate('overview')} scopeBar={scopeBar} />;
      default:
        return (
          <OverviewScreen
            stage={state.stage}
            onNavigate={onNavigate}
            onStageChange={onStageChange}
            /* Overview renders the pipeline itself, so the bar would say it twice. */
            scopeBar={contextOnly}
          />
        );
    }
  })();

  return (
    <>
      {state.variant === 'B' && setActionMenu && (
        <MountPointPortal setMountPoint={setActionMenu}>
          <StageHeaderPill {...controlProps} />
        </MountPointPortal>
      )}

      {screen}

      <PrototypeSwitcher variant={state.variant} onChange={onVariantChange} />
    </>
  );
};

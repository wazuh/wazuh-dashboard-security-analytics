/*
 * PROTOTYPE — throwaway. R4: promotion as a reviewable change set.
 * Three things the current screen lacks: a diff per updated entity (EuiTextDiff,
 * unused in the product today), per-entity selection with dependency notes, and
 * pre-flight checks that were previously discovered inside the confirm modal.
 * Friction is scaled to consequence: Draft → Test confirms plainly, Test → Custom
 * keeps the typed gate and says what goes live.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonGroup,
  EuiCallOut,
  EuiCode,
  EuiCompressedFieldText,
  EuiCompressedFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPageHeader,
  EuiPanel,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTextDiff,
} from '@elastic/eui';
import { ChangeEntity, CHANGE_SET, Operation, PREFLIGHT } from '../mockData';

interface Props {
  scopeBar?: React.ReactNode;
  onDone: () => void;
}

const OPERATION_META: Record<Operation, { color: string; icon: string; label: string }> = {
  add: { color: 'success', icon: 'plusInCircle', label: 'add' },
  update: { color: 'primary', icon: 'pencil', label: 'update' },
  remove: { color: 'danger', icon: 'minusInCircle', label: 'remove' },
};

/** The hook has to live in a component of its own. */
const DiffBlock: React.FC<{ before: string; after: string }> = ({ before, after }) => {
  const [rendered] = useEuiTextDiff({ beforeText: before, afterText: after, timeout: 0.2 });
  return (
    <EuiPanel hasShadow={false} hasBorder={true} paddingSize="m" color="subdued">
      <EuiText size="xs">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          <code>{rendered}</code>
        </pre>
      </EuiText>
    </EuiPanel>
  );
};

const NewContentBlock: React.FC<{ after: string }> = ({ after }) => (
  <EuiPanel hasShadow={false} hasBorder={true} paddingSize="m" color="subdued">
    <EuiText size="xs">
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        <code>{after}</code>
      </pre>
    </EuiText>
  </EuiPanel>
);

export const PromoteScreen: React.FC<Props> = ({ onDone, scopeBar }) => {
  const [target, setTarget] = useState<'test' | 'custom'>('test');
  const [selectedIds, setSelectedIds] = useState<string[]>(CHANGE_SET.map((c) => c.id));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [typed, setTyped] = useState('');

  const isCustom = target === 'custom';
  const selected = CHANGE_SET.filter((c) => selectedIds.includes(c.id));

  /** Selecting a child pulls its parent in — stated, never silent. */
  const toggle = (entity: ChangeEntity) => {
    setSelectedIds((current) => {
      const on = current.includes(entity.id);
      if (on) return current.filter((id) => id !== entity.id);
      const withRequired = new Set([...current, entity.id, ...(entity.requires ?? [])]);
      return Array.from(withRequired);
    });
  };

  const pulledIn = useMemo(() => {
    const names: string[] = [];
    selected.forEach((entity) => {
      (entity.requires ?? []).forEach((id) => {
        const parent = CHANGE_SET.find((c) => c.id === id);
        if (parent && !names.includes(parent.name)) names.push(parent.name);
      });
    });
    return names;
  }, [selectedIds]);

  const deselected = CHANGE_SET.filter((c) => !selectedIds.includes(c.id));

  const columns = [
    {
      name: '',
      width: '32px',
      render: (entity: ChangeEntity) => (
        <input
          type="checkbox"
          aria-label={`Include ${entity.name} in this promotion`}
          checked={selectedIds.includes(entity.id)}
          onChange={() => toggle(entity)}
        />
      ),
    },
    {
      field: 'name',
      name: 'Entity',
      render: (name: string, entity: ChangeEntity) => (
        <div>
          <EuiText size="s" style={{ fontWeight: 600 }}>
            {name}
          </EuiText>
          <EuiText size="xs" color="subdued">
            {entity.kind}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'operation',
      name: 'Operation',
      width: '140px',
      render: (operation: Operation) => {
        const meta = OPERATION_META[operation];
        return (
          <EuiBadge color={meta.color} iconType={meta.icon}>
            {meta.label}
          </EuiBadge>
        );
      },
    },
    {
      name: 'Change',
      width: '220px',
      render: (entity: ChangeEntity) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {entity.operation === 'add' ? (
                <EuiTextColor color="success">new</EuiTextColor>
              ) : (
                <>
                  <EuiTextColor color="success">+{entity.added}</EuiTextColor>{' '}
                  <EuiTextColor color="danger">&minus;{entity.removed}</EuiTextColor>
                </>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSmallButtonEmpty
              size="xs"
              iconType={expanded[entity.id] ? 'arrowUp' : 'arrowDown'}
              iconSide="right"
              onClick={() =>
                setExpanded((current) => ({ ...current, [entity.id]: !current[entity.id] }))
              }
            >
              {entity.operation === 'add' ? 'view' : 'diff'}
            </EuiSmallButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const expandedRowMap = CHANGE_SET.reduce<Record<string, React.ReactNode>>((map, entity) => {
    if (!expanded[entity.id]) return map;
    map[entity.id] =
      entity.before && entity.after ? (
        <DiffBlock before={entity.before} after={entity.after} />
      ) : (
        <NewContentBlock after={entity.after ?? ''} />
      );
    return map;
  }, {});

  const failing = PREFLIGHT.filter((check) => !check.ok);

  return (
    <>
      <EuiPageHeader
        pageTitle={isCustom ? 'Promote Test → Custom' : 'Promote Draft → Test'}
        description={
          isCustom
            ? 'Selected content begins processing all incoming events. There is no automatic rollback — to undo this you must promote a corrected version.'
            : 'Selected content becomes available in Test for validation. It is not active on incoming events.'
        }
        rightSideItems={[
          <EuiButtonGroup
            legend="Promotion target"
            options={[
              { id: 'test', label: 'Draft → Test' },
              { id: 'custom', label: 'Test → Custom' },
            ]}
            idSelected={target}
            onChange={(id) => {
              setTarget(id as 'test' | 'custom');
              setTyped('');
            }}
            buttonSize="compressed"
          />,
        ]}
        bottomBorder={true}
      />
      {scopeBar}
      <EuiSpacer size="l" />

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="s">
        <EuiFlexGroup gutterSize="l" alignItems="center" wrap={true} responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <strong>Pre-flight</strong>
            </EuiText>
          </EuiFlexItem>
          {PREFLIGHT.map((check) => (
            <EuiFlexItem grow={false} key={check.id}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={check.ok ? 'check' : 'alert'}
                    color={check.ok ? 'success' : 'danger'}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{check.label}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h2>
          {selected.length} of {CHANGE_SET.length} changes selected
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none">
        <EuiBasicTable
          items={CHANGE_SET}
          itemId="id"
          columns={columns}
          isExpandable={true}
          itemIdToExpandedRowMap={expandedRowMap}
        />
      </EuiPanel>

      {pulledIn.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <EuiIcon type="link" size="s" /> Included as a dependency: {pulledIn.join(', ')}. A rule
            cannot be promoted without its integration.
          </EuiText>
        </>
      )}

      {deselected.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut size="s" color="warning" iconType="pinFilled" title="Staying in Draft">
            <EuiText size="s">
              {deselected.map((d) => d.name).join(', ')} will not be promoted. The parent
              integration is still promoted, so partial content is expected in the target stage.
            </EuiText>
          </EuiCallOut>
        </>
      )}

      {failing.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            color="warning"
            iconType="alert"
            title={`${failing.length} pre-flight warning`}
          >
            <EuiText size="s">
              {failing.map((f) => f.label).join('. ')}. You can promote anyway — Test exists to
              catch this.
            </EuiText>
          </EuiCallOut>
        </>
      )}

      <EuiHorizontalRule margin="l" />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="m" responsive={false} wrap={true}>
        {isCustom && (
          <EuiFlexItem grow={false} style={{ minWidth: 260 }}>
            <EuiCompressedFormRow
              label="Type promote to confirm"
              helpText="3 decoders and 1 rule will begin processing all incoming events."
            >
              <EuiCompressedFieldText
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="promote"
              />
            </EuiCompressedFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiSmallButtonEmpty onClick={onDone}>Cancel</EuiSmallButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            fill={true}
            color={isCustom ? 'danger' : 'primary'}
            disabled={selected.length === 0 || (isCustom && typed !== 'promote')}
            onClick={onDone}
          >
            {isCustom
              ? `Activate ${selected.length} changes in Custom`
              : `Promote ${selected.length} changes to Test`}
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued" textAlign="right">
        {isCustom ? (
          <>
            Typed confirmation is reserved for this move — it is the one that changes what runs in
            production.
          </>
        ) : (
          <>
            No typed confirmation: <EuiCode>Draft → Test</EuiCode> is a forward move into a sandbox.
          </>
        )}
      </EuiText>
      <EuiSpacer size="xl" />
    </>
  );
};

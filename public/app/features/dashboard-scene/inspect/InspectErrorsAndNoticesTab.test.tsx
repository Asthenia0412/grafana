import { act, render, screen } from '@testing-library/react';

import { DataSourceApi, EventBusSrv, getDefaultTimeRange, LoadingState } from '@grafana/data';
import { PanelStatusStore } from '@grafana/data/internal';
import { SceneDataNode, VizPanel } from '@grafana/scenes';
import type { PanelContext } from '@grafana/ui';

import { InspectErrorsAndNoticesTab } from './InspectErrorsAndNoticesTab';

class CustomDatasource extends DataSourceApi {
  query = jest.fn();
  testDatasource = jest.fn();
  components = { ErrorsAndNoticesInspector: () => <div>Datasource details</div> };
}

it('shows query errors before host initialization and respects an initialized empty store', () => {
  const store = new PanelStatusStore();
  store.createSource().set([{ id: 'panel', severity: 'warning', text: 'Choose field' }]);
  const panel = new VizPanel({
    $data: new SceneDataNode({
      data: {
        series: [],
        state: LoadingState.Error,
        timeRange: getDefaultTimeRange(),
        errors: [{ message: 'Query failed' }],
      },
    }),
    extendPanelContext: (_, context) => {
      context.notices = store;
    },
  });
  const tab = new InspectErrorsAndNoticesTab({ panelRef: panel.getRef() });
  render(<tab.Component model={tab} />);
  expect(screen.getByText('Query failed')).toBeVisible();
  expect(screen.getByText('Choose field')).toBeVisible();
  act(() => store.setExternal([]));
  expect(screen.getByText('Choose field')).toBeVisible();
  expect(screen.queryByText('Query failed')).not.toBeInTheDocument();
  act(() => store.clear());
  expect(screen.getByText('Query failed')).toBeVisible();
  act(() => store.setExternal([]));
  expect(screen.getByText('No errors or notices for this panel.')).toBeVisible();
  expect(screen.queryByText('Query failed')).not.toBeInTheDocument();
});

it('uses a custom inspector instead of standard panel notices', () => {
  const store = new PanelStatusStore();
  const source = store.createSource();
  const onClick = jest.fn();
  source.set([
    {
      id: 'field',
      severity: 'warning',
      text: 'Choose a numeric field',
      actions: [{ id: 'choose', label: 'Choose field', onClick }],
    },
  ]);
  const onInvestigateStatusItem = jest.fn();
  const context: PanelContext = {
    notices: store,
    eventsScope: 'panel',
    eventBus: new EventBusSrv(),
    onInvestigateStatusItem,
  };
  const panel = new VizPanel({
    $data: new SceneDataNode({ data: { series: [], state: LoadingState.Done, timeRange: getDefaultTimeRange() } }),
    extendPanelContext: (_, target) => Object.assign(target, context),
  });
  const datasource = new CustomDatasource({
    id: 1,
    uid: 'test',
    type: 'test',
    name: 'Test',
    access: 'proxy',
    readOnly: false,
    meta: {} as DataSourceApi['meta'],
    jsonData: {},
  });
  const tab = new InspectErrorsAndNoticesTab({ panelRef: panel.getRef(), dataSource: datasource });
  render(<tab.Component model={tab} />);
  expect(screen.getByText('Datasource details')).toBeVisible();
  expect(screen.queryByText('Choose a numeric field')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Choose field' })).not.toBeInTheDocument();
  expect(onClick).not.toHaveBeenCalled();
  expect(onInvestigateStatusItem).not.toHaveBeenCalled();
});

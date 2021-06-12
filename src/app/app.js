import {render} from 'react-dom';
import React from 'react';

import DashboardAddons from 'hub-dashboard-addons';

import Wid from './Components/wid';
import Widget from './Components/Widget';

DashboardAddons.registerWidget((dashboardApi, registerWidgetApi) => {
  render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  );
});

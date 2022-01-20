/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { HelmChart } from "../../../../common/k8s-api/endpoints";
import { DockTabData, DockTabCreate, DockTabCreateSpecific, TabKind } from "../store";
import type { InstallChartStore } from "../install-chart-store/install-chart.store";

interface Dependencies {
  createDockTab: (rawTab: DockTabCreate, addNumber: boolean) => DockTabData;
  installChartStore: InstallChartStore;
}

export function createInstallChartTab({ createDockTab, installChartStore }: Dependencies) {
  return (chart: HelmChart, tabParams: DockTabCreateSpecific = {}) => {
    const { name, repo, version } = chart;

    const tab = createDockTab(
      {
        title: `Helm Install: ${repo}/${name}`,
        ...tabParams,
        kind: TabKind.INSTALL_CHART,
      },
      false,
    );

    installChartStore.setData(tab.id, {
      name,
      repo,
      version,
      namespace: "default",
      releaseName: "",
      description: "",
    });

    return tab;
  };
}

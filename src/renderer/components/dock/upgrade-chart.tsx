/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./upgrade-chart.scss";

import React from "react";
import { action, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { cssNames } from "../../utils";
import type { DockTab } from "./dock-store/dock.store";
import { InfoPanel } from "./info-panel";
import type { UpgradeChartStore } from "./upgrade-chart-store/upgrade-chart.store";
import { Spinner } from "../spinner";
import { Badge } from "../badge";
import { EditorPanel } from "./editor-panel";
import {
  helmChartStore,
  IChartVersion,
} from "../+apps-helm-charts/helm-chart.store";
import type {
  HelmRelease,
  IReleaseUpdateDetails,
  IReleaseUpdatePayload,
} from "../../../common/k8s-api/endpoints/helm-releases.api";
import { Select, SelectOption } from "../select";
import { IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import upgradeChartStoreInjectable from "./upgrade-chart-store/upgrade-chart-store.injectable";
import updateReleaseInjectable from "../+apps-releases/update-release/update-release.injectable";
import releasesInjectable from "../+apps-releases/releases.injectable";

interface Props {
  className?: string;
  tab: DockTab;
}

interface Dependencies {
  releases: IAsyncComputed<HelmRelease[]>
  upgradeChartStore: UpgradeChartStore
  updateRelease: (name: string, namespace: string, payload: IReleaseUpdatePayload) => Promise<IReleaseUpdateDetails>
}

@observer
export class NonInjectedUpgradeChart extends React.Component<Props & Dependencies> {
  @observable error: string;
  @observable versions = observable.array<IChartVersion>();
  @observable version: IChartVersion;

  constructor(props: Props & Dependencies) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    this.loadVersions();

    disposeOnUnmount(this, [
      reaction(() => this.release, () => this.loadVersions()),
    ]);
  }

  get tabId() {
    return this.props.tab.id;
  }

  get release(): HelmRelease {
    const tabData = this.props.upgradeChartStore.getData(this.tabId);

    if (!tabData) return null;

    return this.props.releases.value.get().find(release => release.getName() === tabData.releaseName);
  }

  get value() {
    return this.props.upgradeChartStore.values.getData(this.tabId);
  }

  async loadVersions() {
    if (!this.release) return;
    this.version = null;
    this.versions.clear();
    const versions = await helmChartStore.getVersions(this.release.getChart());

    this.versions.replace(versions);
    this.version = this.versions[0];
  }

  @action
  onChange = (value: string) => {
    this.error = "";
    this.props.upgradeChartStore.values.setData(this.tabId, value);
  };

  @action
  onError = (error: Error | string) => {
    this.error = error.toString();
  };

  upgrade = async () => {
    if (this.error) return null;
    const { version, repo } = this.version;
    const releaseName = this.release.getName();
    const releaseNs = this.release.getNs();

    await this.props.updateRelease(releaseName, releaseNs, {
      chart: this.release.getChart(),
      values: this.value,
      repo, version,
    });

    return (
      <p>
        Release <b>{releaseName}</b> successfully upgraded to version <b>{version}</b>
      </p>
    );
  };

  formatVersionLabel = ({ value }: SelectOption<IChartVersion>) => {
    const chartName = this.release.getChart();
    const { repo, version } = value;

    return `${repo}/${chartName}-${version}`;
  };

  render() {
    const { tabId, release, value, error, onChange, onError, upgrade, versions, version } = this;
    const { className } = this.props;

    if (!release || this.props.upgradeChartStore.isLoading() || !version) {
      return <Spinner center/>;
    }
    const currentVersion = release.getVersion();
    const controlsAndInfo = (
      <div className="upgrade flex gaps align-center">
        <span>Release</span> <Badge label={release.getName()}/>
        <span>Namespace</span> <Badge label={release.getNs()}/>
        <span>Version</span> <Badge label={currentVersion}/>
        <span>Upgrade version</span>
        <Select
          className="chart-version"
          menuPlacement="top"
          themeName="outlined"
          value={version}
          options={versions}
          formatOptionLabel={this.formatVersionLabel}
          onChange={({ value }: SelectOption) => this.version = value}
        />
      </div>
    );

    return (
      <div className={cssNames("UpgradeChart flex column", className)}>
        <InfoPanel
          tabId={tabId}
          error={error}
          submit={upgrade}
          submitLabel="Upgrade"
          submittingMessage="Updating.."
          controls={controlsAndInfo}
        />
        <EditorPanel
          tabId={tabId}
          value={value}
          onChange={onChange}
          onError={onError}
        />
      </div>
    );
  }
}

export const UpgradeChart = withInjectables<Dependencies, Props>(
  NonInjectedUpgradeChart,

  {
    getProps: (di, props) => ({
      releases: di.inject(releasesInjectable),
      updateRelease: di.inject(updateReleaseInjectable),
      upgradeChartStore: di.inject(upgradeChartStoreInjectable),
      ...props,
    }),
  },
);

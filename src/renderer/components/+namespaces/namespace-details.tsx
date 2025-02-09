/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./namespace-details.scss";

import React from "react";
import { computed, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { DrawerItem } from "../drawer";
import { boundMethod, cssNames, Disposer } from "../../utils";
import { getMetricsForNamespace, IPodMetrics, Namespace } from "../../../common/k8s-api/endpoints";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { Link } from "react-router-dom";
import { Spinner } from "../spinner";
import { resourceQuotaStore } from "../+config-resource-quotas/resource-quotas.store";
import { KubeObjectMeta } from "../kube-object-meta";
import { limitRangeStore } from "../+config-limit-ranges/limit-ranges.store";
import { ResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../+workloads-pods/pod-charts";
import { ClusterMetricsResourceType } from "../../../common/cluster-types";
import { getActiveClusterEntity } from "../../api/catalog-entity-registry";
import { getDetailsUrl } from "../kube-detail-params";
import logger from "../../../common/logger";
import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { KubeObject } from "../../../common/k8s-api/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import kubeWatchApiInjectable
  from "../../kube-watch-api/kube-watch-api.injectable";

interface Props extends KubeObjectDetailsProps<Namespace> {
}

interface Dependencies {
  subscribeStores: (stores: KubeObjectStore<KubeObject>[]) => Disposer
}

@observer
class NonInjectedNamespaceDetails extends React.Component<Props & Dependencies> {
  @observable metrics: IPodMetrics = null;

  constructor(props: Props & Dependencies) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      reaction(() => this.props.object, () => {
        this.metrics = null;
      }),

      this.props.subscribeStores([
        resourceQuotaStore,
        limitRangeStore,
      ]),
    ]);
  }

  @computed get quotas() {
    const namespace = this.props.object.getName();

    return resourceQuotaStore.getAllByNs(namespace);
  }

  @computed get limitranges() {
    const namespace = this.props.object.getName();

    return limitRangeStore.getAllByNs(namespace);
  }

  @boundMethod
  async loadMetrics() {
    this.metrics = await getMetricsForNamespace(this.props.object.getName(), "");
  }

  render() {
    const { object: namespace } = this.props;

    if (!namespace) {
      return null;
    }

    if (!(namespace instanceof Namespace)) {
      logger.error("[NamespaceDetails]: passed object that is not an instanceof Namespace", namespace);

      return null;
    }

    const status = namespace.getStatus();
    const isMetricHidden = getActiveClusterEntity()?.isMetricHidden(ClusterMetricsResourceType.Namespace);

    return (
      <div className="NamespaceDetails">
        {!isMetricHidden && (
          <ResourceMetrics
            loader={this.loadMetrics}
            tabs={podMetricTabs} object={namespace} params={{ metrics: this.metrics }}
          >
            <PodCharts />
          </ResourceMetrics>
        )}
        <KubeObjectMeta object={namespace}/>

        <DrawerItem name="Status">
          <span className={cssNames("status", status.toLowerCase())}>{status}</span>
        </DrawerItem>

        <DrawerItem name="Resource Quotas" className="quotas flex align-center">
          {!this.quotas && resourceQuotaStore.isLoading && <Spinner/>}
          {this.quotas.map(quota => {
            return (
              <Link key={quota.getId()} to={getDetailsUrl(quota.selfLink)}>
                {quota.getName()}
              </Link>
            );
          })}
        </DrawerItem>
        <DrawerItem name="Limit Ranges">
          {!this.limitranges && limitRangeStore.isLoading && <Spinner/>}
          {this.limitranges.map(limitrange => {
            return (
              <Link key={limitrange.getId()} to={getDetailsUrl(limitrange.selfLink)}>
                {limitrange.getName()}
              </Link>
            );
          })}
        </DrawerItem>
      </div>
    );
  }
}

export const NamespaceDetails = withInjectables<Dependencies, Props>(
  NonInjectedNamespaceDetails,

  {
    getProps: (di, props) => ({
      subscribeStores: di.inject(kubeWatchApiInjectable).subscribeStores,
      ...props,
    }),
  },
);


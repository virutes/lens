/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./statefulsets.scss";

import React from "react";
import { observer } from "mobx-react";
import type { RouteComponentProps } from "react-router";
import type { StatefulSet } from "../../../common/k8s-api/endpoints";
import { podsStore } from "../+workloads-pods/pods.store";
import { statefulSetStore } from "./statefulset.store";
import { eventStore } from "../+events/event.store";
import type { KubeObjectMenuProps } from "../kube-object-menu";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { StatefulSetScaleDialog } from "./statefulset-scale-dialog";
import { MenuItem } from "../menu/menu";
import { Icon } from "../icon/icon";
import type { StatefulSetsRouteParams } from "../../../common/routes";

enum columnId {
  name = "name",
  namespace = "namespace",
  pods = "pods",
  age = "age",
  replicas = "replicas",
}

interface Props extends RouteComponentProps<StatefulSetsRouteParams> {
}

@observer
export class StatefulSets extends React.Component<Props> {
  renderPods(statefulSet: StatefulSet) {
    const { readyReplicas, currentReplicas } = statefulSet.status;

    return `${readyReplicas || 0}/${currentReplicas || 0}`;
  }

  render() {
    return (
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_statefulsets"
        className="StatefulSets" store={statefulSetStore}
        dependentStores={[podsStore, eventStore]} // status icon component uses event store, details component uses podStore
        sortingCallbacks={{
          [columnId.name]: statefulSet => statefulSet.getName(),
          [columnId.namespace]: statefulSet => statefulSet.getNs(),
          [columnId.age]: statefulSet => statefulSet.getTimeDiffFromNow(),
          [columnId.replicas]: statefulSet => statefulSet.getReplicas(),
        }}
        searchFilters={[
          statefulSet => statefulSet.getSearchFields(),
        ]}
        renderHeaderTitle="Stateful Sets"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Pods", className: "pods", id: columnId.pods },
          { title: "Replicas", className: "replicas", sortBy: columnId.replicas, id: columnId.replicas },
          { className: "warning", showWithColumn: columnId.replicas },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={statefulSet => [
          statefulSet.getName(),
          statefulSet.getNs(),
          this.renderPods(statefulSet),
          statefulSet.getReplicas(),
          <KubeObjectStatusIcon key="icon" object={statefulSet}/>,
          statefulSet.getAge(),
        ]}
        renderItemMenu={item => <StatefulSetMenu object={item} />}
      />
    );
  }
}

export function StatefulSetMenu(props: KubeObjectMenuProps<StatefulSet>) {
  const { object, toolbar } = props;

  return (
    <>
      <MenuItem onClick={() => StatefulSetScaleDialog.open(object)}>
        <Icon material="open_with" tooltip="Scale" interactive={toolbar}/>
        <span className="title">Scale</span>
      </MenuItem>
    </>
  );
}

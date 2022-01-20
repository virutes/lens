/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, IReactionDisposer, observable, when } from "mobx";
import logger from "../../../main/logger";
import { clusterVisibilityHandler } from "../../../common/cluster-ipc";
import type { ClusterId } from "../../../common/cluster-types";
import { getClusterFrameUrl } from "../../utils";
import { ipcRenderer } from "electron";
import type { Cluster } from "../../../common/cluster/cluster";

export interface LensView {
  isLoaded: boolean;
  frame: HTMLIFrameElement;
}

export interface ClusterFrameHandlerDependencies {
  getClusterById: (id: string) => Cluster | null;
}

export class ClusterFrameHandler {
  private views = observable.map<string, LensView>();

  constructor(protected readonly dependencies: ClusterFrameHandlerDependencies) {}

  public hasLoadedView(clusterId: string): boolean {
    return Boolean(this.views.get(clusterId)?.isLoaded);
  }

  public initView = action((clusterId: ClusterId) => {
    const cluster = this.dependencies.getClusterById(clusterId);

    if (!cluster || this.views.has(clusterId)) {
      return;
    }

    logger.info(`[LENS-VIEW]: init dashboard, clusterId=${clusterId}`);
    const parentElem = document.getElementById("lens-views");
    const iframe = document.createElement("iframe");

    iframe.id = `cluster-frame-${cluster.id}`;
    iframe.name = cluster.contextName;
    iframe.style.display = "none";
    iframe.setAttribute("src", getClusterFrameUrl(clusterId));
    iframe.addEventListener("load", () => {
      logger.info(`[LENS-VIEW]: loaded from ${iframe.src}`);
      this.views.get(clusterId).isLoaded = true;
    }, { once: true });
    this.views.set(clusterId, { frame: iframe, isLoaded: false });
    parentElem.appendChild(iframe);

    logger.info(`[LENS-VIEW]: waiting cluster to be ready, clusterId=${clusterId}`);

    const dispose = when(
      () => cluster.ready,
      () => logger.info(`[LENS-VIEW]: cluster is ready, clusterId=${clusterId}`),
    );

    when(
      // cluster.disconnect is set to `false` when the cluster starts to connect
      () => !cluster.disconnected,
      () => {
        when(
          () => {
            const cluster = this.dependencies.getClusterById(clusterId);

            return !cluster || (cluster.disconnected && this.views.get(clusterId)?.isLoaded);
          },
          () => {
            logger.info(`[LENS-VIEW]: remove dashboard, clusterId=${clusterId}`);
            this.views.delete(clusterId);
            iframe.parentNode.removeChild(iframe);
            dispose();
          },
        );
      },
    );
  });

  private prevVisibleClusterChange?: IReactionDisposer;

  public setVisibleCluster(clusterId: ClusterId | null) {
    // Clear the previous when ASAP
    this.prevVisibleClusterChange?.();

    logger.info(`[LENS-VIEW]: refreshing iframe views, visible cluster id=${clusterId}`);
    ipcRenderer.send(clusterVisibilityHandler);

    for (const { frame: view } of this.views.values()) {
      view.style.display = "none";
    }

    const cluster = this.dependencies.getClusterById(clusterId);

    if (cluster) {
      this.prevVisibleClusterChange = when(
        () => cluster.available && cluster.ready && this.views.get(clusterId)?.isLoaded,
        () => {
          logger.info(`[LENS-VIEW]: cluster id=${clusterId} should now be visible`);
          this.views.get(clusterId).frame.style.display = "flex";
          ipcRenderer.send(clusterVisibilityHandler, clusterId);
        },
      );
    }
  }

  public clearVisibleCluster() {
    this.setVisibleCluster(null);
  }
}

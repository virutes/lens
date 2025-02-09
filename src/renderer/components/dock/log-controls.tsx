/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./log-controls.scss";

import React from "react";
import { observer } from "mobx-react";

import { Pod } from "../../../common/k8s-api/endpoints";
import { cssNames, saveFileDialog } from "../../utils";
import { Checkbox } from "../checkbox";
import { Icon } from "../icon";
import type { LogTabData } from "./log-tab-store/log-tab.store";
import type { LogStore } from "./log-store/log.store";
import { withInjectables } from "@ogre-tools/injectable-react";
import logStoreInjectable from "./log-store/log-store.injectable";

interface Props {
  tabData?: LogTabData
  logs: string[]
  save: (data: Partial<LogTabData>) => void
}

interface Dependencies {
  logStore: LogStore
}

const NonInjectedLogControls = observer((props: Props & Dependencies) => {
  const { tabData, save, logs, logStore } = props;

  if (!tabData) {
    return null;
  }

  const { showTimestamps, previous } = tabData;
  const since = logs.length ? logStore.getTimestamps(logs[0]) : null;
  const pod = new Pod(tabData.selectedPod);

  const toggleTimestamps = () => {
    save({ showTimestamps: !showTimestamps });
  };

  const togglePrevious = () => {
    save({ previous: !previous });
    logStore.reload();
  };

  const downloadLogs = () => {
    const fileName = pod.getName();
    const logsToDownload = showTimestamps ? logs : logStore.logsWithoutTimestamps;

    saveFileDialog(`${fileName}.log`, logsToDownload.join("\n"), "text/plain");
  };

  return (
    <div className={cssNames("LogControls flex gaps align-center justify-space-between wrap")}>
      <div className="time-range">
        {since && (
          <span>
            Logs from{" "}
            <b>{new Date(since[0]).toLocaleString()}</b>
          </span>
        )}
      </div>
      <div className="flex gaps align-center">
        <Checkbox
          label="Show timestamps"
          value={showTimestamps}
          onChange={toggleTimestamps}
          className="show-timestamps"
        />
        <Checkbox
          label="Show previous terminated container"
          value={previous}
          onChange={togglePrevious}
          className="show-previous"
        />
        <Icon
          material="get_app"
          onClick={downloadLogs}
          tooltip="Download"
          className="download-icon"
        />
      </div>
    </div>
  );
});

export const LogControls = withInjectables<Dependencies, Props>(
  NonInjectedLogControls,

  {
    getProps: (di, props) => ({
      logStore: di.inject(logStoreInjectable),
      ...props,
    }),
  },
);


/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@k8slens/extensions";
import { PodAttachMenu, PodAttachMenuProps } from "./src/attach-menu";
import { PodShellMenu, PodShellMenuProps } from "./src/shell-menu";
import { PodLogsMenu, PodLogsMenuProps } from "./src/logs-menu";
import React from "react";

export default class PodMenuRendererExtension extends Renderer.LensExtension {
  kubeObjectMenuItems = [
    {
      kind: "Pod",
      apiVersions: ["v1"],
      components: {
        MenuItem: (props: PodAttachMenuProps) => <PodAttachMenu {...props} />,
      },
    },
    {
      kind: "Pod",
      apiVersions: ["v1"],
      components: {
        MenuItem: (props: PodShellMenuProps) => <PodShellMenu {...props} />,
      },
    },
    {
      kind: "Pod",
      apiVersions: ["v1"],
      components: {
        MenuItem: (props: PodLogsMenuProps) => <PodLogsMenu {...props} />,
      },
    },
  ];
}

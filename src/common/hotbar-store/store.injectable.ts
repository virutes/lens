/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { hotbarStoreMigrationsInjectionToken } from "./migrations-injectable-token";
import { HotbarStore } from "./store";

const hotbarManagerInjectable = getInjectable({
  instantiate: (di) => HotbarStore.createInstance({
    migrations: di.inject(hotbarStoreMigrationsInjectionToken),
  }),
  lifecycle: lifecycleEnum.singleton,
});

export default hotbarManagerInjectable;

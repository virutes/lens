/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { boundMethod, cssNames } from "../../utils";
import type { KubeObject } from "../../../common/k8s-api/kube-object";
import { MenuActions, MenuActionsProps } from "../menu";
import identity from "lodash/identity";
import type { ApiManager } from "../../../common/k8s-api/api-manager";
import { withInjectables } from "@ogre-tools/injectable-react";
import clusterNameInjectable from "./dependencies/cluster-name.injectable";
import editResourceTabInjectable from "../dock/edit-resource-tab/edit-resource-tab.injectable";
import hideDetailsInjectable from "./dependencies/hide-details.injectable";
import kubeObjectMenuItemsInjectable from "./dependencies/kube-object-menu-items/kube-object-menu-items.injectable";
import apiManagerInjectable from "./dependencies/api-manager.injectable";

export interface KubeObjectMenuProps<TKubeObject extends KubeObject> extends MenuActionsProps {
  object: TKubeObject | null | undefined;
  editable?: boolean;
  removable?: boolean;
}

interface Dependencies {
  apiManager: ApiManager;
  kubeObjectMenuItems: React.ElementType[];
  clusterName: string;
  hideDetails: () => void;
  editResourceTab: (kubeObject: KubeObject) => void;
}

class NonInjectedKubeObjectMenu<TKubeObject extends KubeObject> extends React.Component<KubeObjectMenuProps<TKubeObject> & Dependencies> {

  get store() {
    const { object } = this.props;

    if (!object) return null;

    return this.props.apiManager.getStore(object.selfLink);
  }

  get isEditable() {
    return this.props.editable ?? Boolean(this.store?.patch);
  }

  get isRemovable() {
    return this.props.removable ?? Boolean(this.store?.remove);
  }

  @boundMethod
  async update() {
    this.props.hideDetails();
    this.props.editResourceTab(this.props.object);
  }

  @boundMethod
  async remove() {
    this.props.hideDetails();
    const { object, removeAction } = this.props;

    if (removeAction) await removeAction();
    else await this.store.remove(object);
  }

  @boundMethod
  renderRemoveMessage() {
    const { object } = this.props;

    if (!object) {
      return null;
    }

    const breadcrumbParts = [object.getNs(), object.getName()];

    const breadcrumb = breadcrumbParts.filter(identity).join("/");

    return (
      <p>
        Remove {object.kind} <b>{breadcrumb}</b> from <b>{this.props.clusterName}</b>?
      </p>
    );
  }

  getMenuItems(): React.ReactChild[] {
    const { object, toolbar } = this.props;

    return this.props.kubeObjectMenuItems.map((MenuItem, index) => (
      <MenuItem object={object} toolbar={toolbar} key={`menu-item-${index}`} />
    ));
  }

  render() {
    const { remove, update, renderRemoveMessage, isEditable, isRemovable } = this;
    const { className, editable, removable, ...menuProps } = this.props;

    return (
      <MenuActions
        className={cssNames("KubeObjectMenu", className)}
        updateAction={isEditable ? update : undefined}
        removeAction={isRemovable ? remove : undefined}
        removeConfirmationMessage={renderRemoveMessage}
        {...menuProps}
      >
        {this.getMenuItems()}
      </MenuActions>
    );
  }
}

export function KubeObjectMenu<T extends KubeObject>(
  props: KubeObjectMenuProps<T>,
) {
  const InjectedKubeObjectMenu = withInjectables<Dependencies, KubeObjectMenuProps<T>>(
    NonInjectedKubeObjectMenu,
    {
      getProps: (di, props) => ({
        clusterName: di.inject(clusterNameInjectable),
        apiManager: di.inject(apiManagerInjectable),
        editResourceTab: di.inject(editResourceTabInjectable),
        hideDetails: di.inject(hideDetailsInjectable),

        kubeObjectMenuItems: di.inject(kubeObjectMenuItemsInjectable, {
          kubeObject: props.object,
        }),
        ...props,
      }),
    },
  );

  return <InjectedKubeObjectMenu {...props} />;
}

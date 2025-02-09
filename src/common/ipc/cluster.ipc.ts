/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * This channel is broadcast on whenever the cluster fails to list namespaces
 * during a refresh and no `accessibleNamespaces` have been set.
 */
export const ClusterListNamespaceForbiddenChannel = "cluster:list-namespace-forbidden";

export type ListNamespaceForbiddenArgs = [clusterId: string];

export function isListNamespaceForbiddenArgs(args: unknown[]): args is ListNamespaceForbiddenArgs {
  return args.length === 1 && typeof args[0] === "string";
}

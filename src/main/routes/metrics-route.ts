/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LensApiRequest } from "../router";
import { respondJson } from "../utils/http-responses";
import type { Cluster } from "../../common/cluster/cluster";
import { ClusterMetadataKey, ClusterPrometheusMetadata } from "../../common/cluster-types";
import logger from "../logger";
import { getMetrics } from "../k8s-request";
import { PrometheusProviderRegistry } from "../prometheus";

export type IMetricsQuery = string | string[] | {
  [metricName: string]: string;
};

// This is used for backoff retry tracking.
const ATTEMPTS = [false, false, false, false, true];

// prometheus metrics loader
async function loadMetrics(promQueries: string[], cluster: Cluster, prometheusPath: string, queryParams: Record<string, string>): Promise<any[]> {
  const queries = promQueries.map(p => p.trim());
  const loaders = new Map<string, Promise<any>>();

  async function loadMetric(query: string): Promise<any> {
    async function loadMetricHelper(): Promise<any> {
      for (const [attempt, lastAttempt] of ATTEMPTS.entries()) { // retry
        try {
          return await getMetrics(cluster, prometheusPath, { query, ...queryParams });
        } catch (error) {
          if (lastAttempt || (error?.statusCode >= 400 && error?.statusCode < 500)) {
            logger.error("[Metrics]: metrics not available", error?.response ? error.response?.body : error);
            throw new Error("Metrics not available");
          }

          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000)); // add delay before repeating request
        }
      }
    }

    return loaders.get(query) ?? loaders.set(query, loadMetricHelper()).get(query);
  }

  return Promise.all(queries.map(loadMetric));
}

interface MetricProviderInfo {
  name: string;
  id: string;
  isConfigurable: boolean;
}

export class MetricsRoute {
  static async routeMetrics({ response, cluster, payload, query }: LensApiRequest) {
    const queryParams: IMetricsQuery = Object.fromEntries(query.entries());
    const prometheusMetadata: ClusterPrometheusMetadata = {};

    try {
      const { prometheusPath, provider } = await cluster.contextHandler.getPrometheusDetails();

      prometheusMetadata.provider = provider?.id;
      prometheusMetadata.autoDetected = !cluster.preferences.prometheusProvider?.type;

      if (!prometheusPath) {
        prometheusMetadata.success = false;

        return respondJson(response, {});
      }

      // return data in same structure as query
      if (typeof payload === "string") {
        const [data] = await loadMetrics([payload], cluster, prometheusPath, queryParams);

        respondJson(response, data);
      } else if (Array.isArray(payload)) {
        const data = await loadMetrics(payload, cluster, prometheusPath, queryParams);

        respondJson(response, data);
      } else {
        const queries = Object.entries<Record<string, string>>(payload)
          .map(([queryName, queryOpts]) => (
            provider.getQuery(queryOpts, queryName)
          ));
        const result = await loadMetrics(queries, cluster, prometheusPath, queryParams);
        const data = Object.fromEntries(Object.keys(payload).map((metricName, i) => [metricName, result[i]]));

        respondJson(response, data);
      }
      prometheusMetadata.success = true;
    } catch (error) {
      prometheusMetadata.success = false;
      respondJson(response, {});
      logger.warn(`[METRICS-ROUTE]: failed to get metrics for clusterId=${cluster.id}:`, error);
    } finally {
      cluster.metadata[ClusterMetadataKey.PROMETHEUS] = prometheusMetadata;
    }
  }

  static async routeMetricsProviders({ response }: LensApiRequest) {
    const providers: MetricProviderInfo[] = [];

    for (const { name, id, isConfigurable } of PrometheusProviderRegistry.getInstance().providers.values()) {
      providers.push({ name, id, isConfigurable });
    }

    respondJson(response, providers);
  }
}

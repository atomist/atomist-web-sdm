/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LocalSoftwareDeliveryMachineConfiguration } from "@atomist/sdm-core/lib/internal/machine/LocalSoftwareDeliveryMachineOptions";
import { ConfigureMachineOptions } from "@atomist/sdm-core/lib/machine/configure";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/lib/api/machine/SoftwareDeliveryMachineOptions";
import * as _ from "lodash";

/**
 * Use to workaround name being optional in the configuration when it
 * really is not.
 */
export const DefaultName = "@atomist/atomist-web-sdm";

/**
 * Provide default SDM configuration. If any other source defines
 * these values, they will override these defaults.
 */
async function configureSdmDefaults(cfg: LocalSoftwareDeliveryMachineConfiguration): Promise<LocalSoftwareDeliveryMachineConfiguration> {
    const defaultCfg: SoftwareDeliveryMachineConfiguration = {
        sdm: {
            k8s: {
                job: {
                    cleanupInterval: 1000 * 60 * 10,
                    ttl: 1000 * 60 * 30,
                },
            },
            cache: {
                bucket: "atm-atomist-sdm-goal-cache-production",
                enabled: true,
                path: "atomist-web-sdm-cache",
            },
        },
    };
    return _.defaultsDeep(cfg, defaultCfg);
}

export const machineOptions: ConfigureMachineOptions = {
    preProcessors: [
        configureSdmDefaults,
    ],
};

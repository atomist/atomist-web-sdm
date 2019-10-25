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

import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import { configureHumio } from "@atomist/automation-client-ext-humio";
import { configureRaven } from "@atomist/automation-client-ext-raven";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm";
import {
    ConfigureMachineOptions,
    LocalSoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm-core";
import * as _ from "lodash";

/**
 * Use to workaround name being optional in the configuration when it
 * reall is not.
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
                },
            },
            cache: {
                bucket: "atm-atomist-sdm-goal-cache-production",
                enabled: true,
                path: "atomist-sdm-cache",
            },
        },
    };
    return _.defaultsDeep(cfg, defaultCfg);
}

export const machineOptions: ConfigureMachineOptions = {
    preProcessors: [
        configureSdmDefaults,
    ],
    postProcessors: [
        configureDashboardNotifications,
        configureHumio,
        configureRaven,
    ],
};

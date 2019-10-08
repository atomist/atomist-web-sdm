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

import { ToDefaultBranch } from "@atomist/sdm";
import {
    configure,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { machineOptions } from "./lib/configure";
import { AtomistClientSdmGoalConfigurer } from "./lib/goals/goalConfigurer";
import { AtomistClientSdmGoalCreator } from "./lib/goals/goalCreator";
import { AtomistClientSdmGoals } from "./lib/goals/goals";
import { repoSlugMatches } from "./lib/pushTests/name";

/**
 * The main entry point into the SDM
 */
export const configuration = configure<AtomistClientSdmGoals>(async sdm => {

    sdm.addExtensionPacks(
        k8sGoalSchedulingSupport(),
    );

    // Create goals and configure them
    const goals = await sdm.createGoals(AtomistClientSdmGoalCreator, [AtomistClientSdmGoalConfigurer]);

    // Return all push rules
    return {
        webStatic: {
            test: [repoSlugMatches(/^atomisthq\/s3-images$/), ToDefaultBranch],
            goals: [goals.firebaseDeploy],
        },
    };
}, machineOptions);

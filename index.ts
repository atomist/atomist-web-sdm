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
    githubGoalStatusSupport,
    goalStateSupport,
    k8sGoalSchedulingSupport,
} from "@atomist/sdm-core";
import { gcpSupport } from "@atomist/sdm-pack-gcp";
import { issueSupport } from "@atomist/sdm-pack-issue";
import {
    DefaultName,
    machineOptions,
} from "./lib/configure";
import { AtomistClientSdmGoalConfigurer } from "./lib/goals/goalConfigurer";
import { AtomistWebSdmGoalCreator } from "./lib/goals/goalCreator";
import { AtomistWebSdmGoals } from "./lib/goals/goals";
import {
    JekyllPushTest,
    repoSlugMatches,
} from "./lib/goals/pushTests";

export const configuration = configure<AtomistWebSdmGoals>(async sdm => {

    sdm.addExtensionPacks(
        gcpSupport(),
        githubGoalStatusSupport(),
        goalStateSupport({
            cancellation: {
                enabled: true,
            },
        }),
        issueSupport({
            labelIssuesOnDeployment: true,
            closeCodeInspectionIssuesOnBranchDeletion: {
                enabled: true,
                source: sdm.configuration.name || DefaultName,
            },
        }),
        k8sGoalSchedulingSupport(),
    );

    const goals = await sdm.createGoals(AtomistWebSdmGoalCreator, [AtomistClientSdmGoalConfigurer]);

    return {
        jekyll: {
            test: [JekyllPushTest],
            goals: [
                goals.queue,
                goals.version,
                goals.jekyll,
                [goals.codeInspection, goals.htmltest, goals.tag],
            ],
        },
        jekyllDeploy: {
            dependsOn: [goals.htmltest],
            test: [JekyllPushTest, ToDefaultBranch],
            goals: [
                [goals.firebaseStagingDeploy],
                [goals.fetchStaging, goals.approvalGate],
                [goals.releaseTag, goals.firebaseProductionDeploy],
                [goals.fetchProduction, goals.release, goals.incrementVersion],
            ],
        },
        webStatic: {
            test: [repoSlugMatches(/^atomisthq\/s3-images$/), ToDefaultBranch],
            goals: [
                goals.queue,
                goals.firebaseDeploy,
            ],
        },
    };
}, machineOptions);

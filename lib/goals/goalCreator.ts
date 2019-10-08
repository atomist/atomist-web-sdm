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

import {
    goal,
    IndependentOfEnvironment,
    Queue,
} from "@atomist/sdm";
import {
    container,
    GoalCreator,
    Version,
} from "@atomist/sdm-core";
import * as _ from "lodash";
import { AtomistClientSdmGoals } from "./goals";

/**
 * Create all goal instances and return an instance of HelloWorldGoals
 */
export const AtomistClientSdmGoalCreator: GoalCreator<AtomistClientSdmGoals> = async sdm => {

    const queue = new Queue({ concurrent: 5 });
    const approvalGate = goal(
        {
            displayName: "approval",
            environment: IndependentOfEnvironment,
            preApproval: true,
            descriptions: {
                planned: "Approval pending",
                waitingForPreApproval: "Approval pending",
                completed: "Approved",
            },
        },
        async gi => { /** Intentionally left empty */ });
    const version = new Version();
    const firebaseToken = _.get(sdm, "configuration.sdm.firebase.token");
    const firebaseDeploy = container("web-static-deploy", {
        containers: [
            {
                args: ["firebase", "deploy", "--token", firebaseToken],
                image: "andreysenov/firebase-tools:7.4.0",
                name: "firebase",
            },
        ],
    });

    return {
        queue,
        approvalGate,
        version,
        firebaseDeploy,
    };
};

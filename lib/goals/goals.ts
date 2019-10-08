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
    GoalWithFulfillment,
    Queue,
} from "@atomist/sdm";
import {
    Container,
    DeliveryGoals,
    Version,
} from "@atomist/sdm-core";

/**
 * Interface to capture all goals that this SDM will manage.
 */
export interface AtomistClientSdmGoals extends DeliveryGoals {
    /** Manage concurrent tasks using Queue goal. */
    queue: Queue;
    /** Approval gate goal, insert after goals that need manual approval. */
    approvalGate: GoalWithFulfillment;

    /** Calculate timestamped prerelease version for goal set. */
    version: Version;

    /** Deploy web site using Firebase. */
    firebaseDeploy: Container;
}

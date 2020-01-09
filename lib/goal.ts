/*
 * Copyright © 2020 Atomist, Inc.
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
    AutoCodeInspection,
    Autofix,
    FulfillableGoal,
    GoalWithFulfillment,
    Queue,
} from "@atomist/sdm";
import {
    DeliveryGoals,
    Tag,
    Version,
} from "@atomist/sdm-core";
import {
    IncrementVersion,
    Release,
} from "@atomist/sdm-pack-version";
import { Fetch } from "@atomist/sdm-pack-web";

/**
 * Interface to capture all goals that this SDM will manage.
 */
export interface AtomistWebSdmGoals extends DeliveryGoals {
    /** Manage concurrent tasks using Queue goal. */
    queue: Queue;

    /** Autofixes */
    autofix: Autofix;
    /** Calculate timestamped prerelease version for goal set. */
    version: Version;
    /** Create prerelease version Git tag. */
    tag: Tag;
    /** Create release version Git tag. */
    releaseTag: Tag;

    /** Jekyll web site build. */
    jekyll: FulfillableGoal;
    /** Shadow-cljs web site build. */
    shadowCljs: FulfillableGoal;
    /** NPM webpack web site build. */
    webpack: FulfillableGoal;

    /** Check HTML of web site. */
    codeInspection: AutoCodeInspection;
    /** Run htmltest on web site. */
    htmltest: FulfillableGoal;
    /** Run shadow-cljs tests. */
    shadowCljsTest: FulfillableGoal;

    /** Deploy web site using Firebase. */
    firebaseDeploy: FulfillableGoal;
    /** Deploy staging web site using Firebase. */
    firebaseStagingDeploy: FulfillableGoal;
    /** Deploy production web site using Firebase. */
    firebaseProductionDeploy: FulfillableGoal;

    /** Validiate deployed web site. */
    fetchStaging: Fetch;
    fetchProduction: Fetch;

    /** Approve staging deployment. */
    stagingApproval: GoalWithFulfillment;

    /** Create release. */
    release: Release;
    incrementVersion: IncrementVersion;
}

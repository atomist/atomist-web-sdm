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
    AutoCodeInspection,
    GoalWithFulfillment,
    Queue,
} from "@atomist/sdm";
import {
    Container,
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
    /** Approval gate goal, insert after goals that need manual approval. */
    approvalGate: GoalWithFulfillment;

    /** Calculate timestamped prerelease version for goal set. */
    version: Version;
    /** Create prerelease version Git tag. */
    tag: Tag;
    /** Create release version Git tag. */
    releaseTag: Tag;

    /** Jekyll web site build. */
    jekyll: Container;
    /** NPM webpack web site build. */
    webpack: Container;

    /** Check HTML of web site. */
    codeInspection: AutoCodeInspection;
    /** Run htmltest on web site. */
    htmltest: Container;

    /** Deploy web site using Firebase. */
    firebaseDeploy: Container;
    /** Deploy staging web site using Firebase. */
    firebaseStagingDeploy: Container;
    /** Deploy testing web site using Firebase. */
    firebaseTestingDeploy: Container;
    /** Deploy production web site using Firebase. */
    firebaseProductionDeploy: Container;

    /** Validiate deployed web site. */
    fetchStaging: Fetch;
    fetchTesting: Fetch;
    fetchProduction: Fetch;

    /** Create release. */
    release: Release;
    incrementVersion: IncrementVersion;
}

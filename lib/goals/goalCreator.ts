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
    goal,
    GoalProjectListenerRegistration,
    IndependentOfEnvironment,
    PushTest,
    Queue,
} from "@atomist/sdm";
import {
    cacheRestore,
    container,
    GoalCreator,
    Tag,
    Version,
} from "@atomist/sdm-core";
import {
    IncrementVersion,
    Release,
} from "@atomist/sdm-pack-version";
import { Fetch } from "@atomist/sdm-pack-web";
import * as _ from "lodash";
import { AtomistWebSdmGoals } from "./goals";

/**
 * Create all goal instances and return an instance of HelloWorldGoals
 */
export const AtomistWebSdmGoalCreator: GoalCreator<AtomistWebSdmGoals> = async sdm => {

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
    const tag = new Tag();
    const releaseTag = new Tag();
    const jekyll = container("jekyll", {
        containers: [
            {
                args: ["jekyll", "build"],
                image: "jekyll/jekyll:3.8.4",
                name: "jekyll",
                securityContext: {
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        output: [{
            classifier: "site",
            pattern: { directory: "_site" },
        }],
    });
    const codeInspection = new AutoCodeInspection({ isolate: true });
    const htmltest = container("htmltest", {
        containers: [
            {
                args: ["/bin/sh", "-c", "[ -f .htmltest.yml ] || exit 0; apk update && apk add ca-certificates && htmltest"],
                image: "wjdp/htmltest:v0.10.3",
                name: "htmltest",
                securityContext: {
                    readOnlyRootFilesystem: false,
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        input: ["site"],
    });
    const firebaseToken: string = _.get(sdm, "configuration.sdm.firebase.token");
    const firebaseTokenArgs = (firebaseToken) ? [`--token=${firebaseToken}`] : [];
    const firebaseImage = "andreysenov/firebase-tools:7.4.0";
    const firebaseDeploy = container("firebase-deploy", {
        containers: [
            {
                args: ["firebase", "--non-interactive", "deploy", ...firebaseTokenArgs],
                image: firebaseImage,
                name: "firebase",
            },
        ],
    });
    const [firebaseStagingDeploy, firebaseProductionDeploy] = ["staging", "production"].map(env => container(
        `firebase-${env}-deploy`,
        {
            containers: [
                {
                    args: ["firebase", "--non-interactive", `--project=${env}`, "deploy", ...firebaseTokenArgs],
                    image: firebaseImage,
                    name: "firebase",
                },
            ],
            input: ["site"],
        },
    ));
    const fetchStaging = new Fetch();
    const fetchProduction = new Fetch();
    const release = new Release();
    const incrementVersion = new IncrementVersion();

    return {
        queue,
        approvalGate,
        version,
        tag,
        releaseTag,
        jekyll,
        codeInspection,
        htmltest,
        firebaseDeploy,
        firebaseStagingDeploy,
        firebaseProductionDeploy,
        fetchStaging,
        fetchProduction,
        release,
        incrementVersion,
    };
};

/**
 * Restore the cache classifier "site" and throw an error if it fails.
 */
export function siteCacheRestore(pushTest?: PushTest): GoalProjectListenerRegistration {
    return cacheRestore({
        entries: [{ classifier: "site" }],
        onCacheMiss: {
            name: "fail-if-cache-restore-fails",
            listener: () => { throw new Error("Failed to restore site cache"); },
        },
        pushTest,
    });
}

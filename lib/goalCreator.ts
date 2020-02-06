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
    ExecuteGoal,
    goal,
    GoalProjectListenerRegistration,
    GoalWithFulfillment,
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
import { AtomistWebSdmGoals } from "./goal";

/**
 * Create all goal instances and return an instance of HelloWorldGoals
 */
export const AtomistWebSdmGoalCreator: GoalCreator<AtomistWebSdmGoals> = async sdm => {

    const queue = new Queue({ concurrent: 5 });
    const autofix = new Autofix();
    const version = new Version();
    const tag = new Tag();
    const releaseTag = new Tag();
    const jekyll = container("jekyll", {
        containers: [
            {
                args: ["jekyll", "build"],
                image: "atomist/web-site-build:0.1.0",
                name: "jekyll",
            },
        ],
        output: [{
            classifier: "site",
            pattern: { directory: "_site" },
        }],
    });
    const webpack = container("webpack", {
        containers: [
            {
                args: ["bash", "-c", "npm ci --progress=false && npm run --if-present compile && npm test"],
                env: [{ name: "NODE_ENV", value: "development" }],
                image: "node:12.13.0",
                name: "webpack",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "2560Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "2048Mi",
                    },
                },
                securityContext: {
                    runAsGroup: 1000,
                    runAsNonRoot: true,
                    runAsUser: 1000,
                },
            },
        ],
        initContainers: [
            {
                args: ["/bin/sh", "-c", `chown -Rh 1000:1000 "$ATOMIST_PROJECT_DIR"`],
                image: "busybox:1.31.1",
                name: "chown",
                securityContext: {
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        output: [
            {
                classifier: "node_modules",
                pattern: { directory: "node_modules" },
            },
            {
                classifier: "site",
                pattern: { directory: "public" },
            },
        ],
    });
    const shadowCljsTest = container("shadowcljs-test", {
        containers: [
            {
                args: ["bash", "-c", "npm ci --progress=false && npm run test"],
                env: [{ name: "NODE_ENV", value: "development" }],
                image: "atomist/shadow-cljs:0.1.0",
                name: "shadowcljs-test",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "1024Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "768Mi",
                    },
                },
                securityContext: {
                    runAsGroup: 1000,
                    runAsNonRoot: true,
                    runAsUser: 1000,
                },
            },
        ],
        initContainers: [
            {
                args: ["/bin/sh", "-c", `chown -Rh 1000:1000 "$ATOMIST_PROJECT_DIR"`],
                image: "busybox:1.31.1",
                name: "chown",
                securityContext: {
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        // tslint:disable-next-line:no-invalid-template-strings
        input: ["${repo.owner}/${repo.name}/node_modules", "${repo.owner}/${repo.name}/mvn/cache"],
        output: [
            {
                // tslint:disable-next-line:no-invalid-template-strings
                classifier: "${repo.owner}/${repo.name}/mvn/cache",
                pattern: { directory: ".m2" },
            },
            {
                // tslint:disable-next-line:no-invalid-template-strings
                classifier: "${repo.owner}/${repo.name}/node_modules",
                pattern: { directory: "node_modules" },
            },
        ],
    });
    const shadowCljs = container("shadowcljs", {
        containers: [
            {
                args: ["bash", "-c", "npm run release"],
                env: [{ name: "NODE_ENV", value: "development" }],
                image: "atomist/shadow-cljs:0.1.0",
                name: "shadowcljs",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "1024Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "768Mi",
                    },
                },
                securityContext: {
                    runAsGroup: 1000,
                    runAsNonRoot: true,
                    runAsUser: 1000,
                },
            },
        ],
        initContainers: [
            {
                args: ["/bin/sh", "-c", `chown -Rh 1000:1000 "$ATOMIST_PROJECT_DIR"`],
                image: "busybox:1.31.1",
                name: "chown",
                securityContext: {
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        // tslint:disable-next-line:no-invalid-template-strings
        input: ["${repo.owner}/${repo.name}/node_modules", "${repo.owner}/${repo.name}/mvn/cache"],
        output: [
            {
                classifier: "site",
                pattern: { directory: "public" },
            },
            {
                classifier: "server",
                pattern: { globPattern: "functions/lib.js"},
            },
            {
                classifier: "config",
                pattern: { globPattern: "firebase.json"},
            },
        ],
    });
    const codeInspection = new AutoCodeInspection({ isolate: true });
    const htmltest = container("htmltest", {
        containers: [
            {
                args: ["/bin/sh", "-c", "[ -f .htmltest.yml ] || exit 0; apk update && apk add ca-certificates && htmltest"],
                image: "wjdp/htmltest:v0.10.3",
                name: "htmltest",
            },
        ],
        input: ["site"],
    });
    const firebaseToken: string | undefined = sdm.configuration.sdm.firebase?.token;
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
            // tslint:disable-next-line:no-invalid-template-strings
            input: ["${repo.owner}/${repo.name}/node_modules", "site", "server", "config"],
        },
    ));
    const fetchStaging = new Fetch("fetch-staging");
    const fetchProduction = new Fetch("fetch-production");
    const stagingApproval = approvalGoal("staging");
    const release = new Release();
    const incrementVersion = new IncrementVersion();

    return {
        queue,
        autofix,
        version,
        tag,
        releaseTag,
        jekyll,
        shadowCljsTest,
        shadowCljs,
        webpack,
        codeInspection,
        htmltest,
        firebaseDeploy,
        firebaseStagingDeploy,
        firebaseProductionDeploy,
        fetchStaging,
        fetchProduction,
        stagingApproval,
        release,
        incrementVersion,
    };
};

/** Do nothing goal executor. */
const noOpExecutor: ExecuteGoal = async () => { };

/** Return an "approval" goal. */
function approvalGoal(phase: string): GoalWithFulfillment {
    const details = {
        approval: true,
        descriptions: {
            planned: `Approve ${phase} planned`,
            waitingForApproval: `Waiting for ${phase} approval`,
            completed: `Approved ${phase}`,
        },
        displayName: `approval-${phase}`,
        environment: IndependentOfEnvironment,
    };
    return goal(details, noOpExecutor);
}

/**
 * Restore the cache classifier "site" and throw an error if it fails.
 */
export function cacheClassifierRestore(classifier: string, pushTest?: PushTest): GoalProjectListenerRegistration {
    return cacheRestore({
        entries: [{ classifier }],
        onCacheMiss: {
            name: "fail-if-cache-restore-fails",
            listener: () => { throw new Error("Failed to restore site cache"); },
        },
        pushTest,
    });
}

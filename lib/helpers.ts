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

import { configurationValue } from "@atomist/automation-client/lib/configuration";
import { and, hasFile } from "@atomist/sdm";
import { GoalProjectListenerEvent, GoalProjectListenerRegistration } from "@atomist/sdm/lib/api/goal/GoalInvocation";
import { container, Container, ContainerRegistration } from "@atomist/sdm/lib/core/goal/container/container";
import { repoSlugMatches } from "./pushTest";

export const extractAppEngineUrl = (input: string): string | undefined => {
    const re = /Deployed service \[\w+\] to \[(.*)\]/;
    const match = re.exec(input);
    return match ? match[1] : undefined;
};

export const appEngineVersioner: GoalProjectListenerRegistration = {
    name: "AppEngineVersioner",
    events: [GoalProjectListenerEvent.before],
    listener: async (p, gi) => {
        const shortSha = gi.goalEvent.sha.substr(0, 7);
        const version = `${shortSha}-${gi.goalEvent.branch}`.substr(0, 30);
        await p.addFile("gae-version", version);
    },
};

export const appEngineListener: GoalProjectListenerRegistration = {
    name: "AppEngineListener",
    events: [GoalProjectListenerEvent.after],
    listener: async (p, r) => {
        let data = {};
        let url;
        if (r.progressLog.log) {
            if (r.goalEvent.uniqueName.startsWith("container-appEngine-production-deploy")) {
                url = configurationValue<string>("sdm.webapp.urls.prod");
            } else {
                const extracted = extractAppEngineUrl(r.progressLog.log);
                if (extracted) {
                    url = extracted.replace(
                        /(\w+).(\w+).appspot.com/,
                        configurationValue<string>("sdm.webapp.urls.staging"),
                    );
                }
            }
            if (url) {
                data = {
                    externalUrls: [{ url }],
                };
            }
        }
        return data;
    },
};

export const gcloudSdkImage = "google/cloud-sdk:289.0.0";
const registration: ContainerRegistration = {
    containers: [
        {
            name: "gcloud-sdk",
            image: gcloudSdkImage,
            command: ["/bin/bash", "-c"],
            args: [
                "set -ex; " +
                    `gcloud app deploy app.staging.yaml --quiet --project=atomist-new-web-app-staging --version=$(cat gae-version) --no-promote; `,
            ],
        },
    ],
    /* tslint:disable:no-invalid-template-strings */
    input: [
        { classifier: "${repo.owner}/${repo.name}/${sha}/node_modules" },
        { classifier: "${repo.owner}/${repo.name}/${sha}/site" },
        { classifier: "${repo.owner}/${repo.name}/${sha}/server-express" },
        { classifier: "${repo.owner}/${repo.name}/${sha}/config" },
    ],
    /* tslint:disable:no-invalid-template-strings */
};
export const appEngineEphemeral = new Container({
    displayName: `AppEngine Ephemeral Deployment`,
    preApproval: true,
})
    .with(registration)
    .withProjectListener(appEngineVersioner)
    .withProjectListener(appEngineListener);

export const [runSmokeTestStaging, runSmokeTestProduction] = ["staging", "production"].map(env =>
    container(`Run Smoke Test ${env}`, {
        containers: [
            {
                env: [
                    {
                        name: "CYPRESS_SMOKE_TEST_BASE_URL",
                        value: `https://${
                            env === "production"
                                ? configurationValue<string>("sdm.webapp.urls.prod")
                                : configurationValue<string>("sdm.webapp.urls.staging")
                        }`,
                    },
                ],
                image: "cypress/included:6.1.0",
                name: "cypress-included",
                pushTest: and(repoSlugMatches(/^atomisthq\/web-ap-cljs$/), hasFile("cypress.json")),
                resources: {
                    limits: {
                        cpu: "2000m",
                        memory: "3072Mi",
                    },
                    requests: {
                        cpu: "1000m",
                        memory: "3072Mi",
                    },
                },
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                    runAsGroup: 1000,
                    runAsNonRoot: true,
                    runAsUser: 1000,
                },
            },
        ],
        initContainers: [
            {
                args: ['chown -Rh 1000:1000 "$ATOMIST_PROJECT_DIR"'],
                command: ["/bin/sh", "-c"],
                image: "busybox:1.31.1",
                name: "chown",
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                    runAsGroup: 0,
                    runAsNonRoot: false,
                    runAsUser: 0,
                },
            },
        ],
        /* tslint:disable:no-invalid-template-strings */
        input: [{ classifier: "${repo.owner}/${repo.name}/mvn/cache" }],
        /* tslint:disable:no-invalid-template-strings */
    }),
);

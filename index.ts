/*
 * Copyright © 2021 Atomist, Inc.
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

import { GitProject } from "@atomist/automation-client/lib/project/git/GitProject";
import {
    Cancel,
    Goals,
    ImmaterialGoals,
    not,
    or,
    Queue,
    ToDefaultBranch,
} from "@atomist/sdm";
import { configure, container, ContainerRegistration, executeTag, Tag } from "@atomist/sdm/lib/core";
import { gcpSupport } from "@atomist/sdm/lib/pack/gcp";
import { githubGoalStatusSupport } from "@atomist/sdm/lib/pack/github-goal-status";
import { goalStateSupport } from "@atomist/sdm/lib/pack/goal-state";
import { k8sGoalSchedulingSupport } from "@atomist/sdm/lib/pack/k8s";
import { machineOptions } from "./lib/configure";
import { appEngineListener } from "./lib/helpers";
import {
    AppEnginePushTest,
    FirebasePushTest,
    IsChangelogCommit,
    IsReleaseCommit,
    JekyllPushTest,
    MkDocsPushTest,
    repoSlugMatches,
    WebPackPushTest,
} from "./lib/pushTest";

/* tslint:disable:max-file-line-count */

export const configuration = configure(async sdm => {
    sdm.addExtensionPacks(
        gcpSupport(),
        githubGoalStatusSupport(),
        goalStateSupport({
            cancellation: {
                enabled: true,
            },
        }),
        k8sGoalSchedulingSupport(),
    );

    const none = new Goals("none").andLock();
    const queue = new Queue({ concurrent: 5 });
    const cancel = new Cancel();
    const version = container("version", {
        containers: [
            {
                /* tslint:disable:no-invalid-template-strings */
                args: [
                    "set -ex; " +
                        "if [[ -f VERSION ]]; then v=$(< VERSION); " +
                        "elif [[ -f package.json ]]; then v=$(npx -c 'echo $npm_package_version'); " +
                        "else echo 'No version file found'; v=0.0.0; fi; " +
                        "b=$(echo \"$ATOMIST_BRANCH\" | sed -e 's/[/_]/-/g' -e 's/[^-A-Za-z0-9.]//g' -e 's/--*/-/g' -e 's/-$//'); " +
                        "d=$(date -u +%Y%m%d%H%M%S); " +
                        "p=$v-$b.$d; " +
                        `printf -v r '{"SdmGoal":{"push":{"after":{"version":"%s"}}}}' "$p"; ` +
                        'echo "$r" > "$ATOMIST_RESULT"',
                ],
                /* tslint:enable:no-invalid-template-strings */
                command: ["/bin/bash", "-c"],
                image: "node:12.14.1",
                name: "version",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "256Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "256Mi",
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
    });
    const tag = new Tag();
    const releaseTag = new Tag().with({
        name: "release-tag",
        goalExecutor: executeTag({ release: true }),
    });
    const jekyll = container("jekyll", {
        containers: [
            {
                args: ["jekyll", "build"],
                image: "atomist/web-site-build:0.1.0",
                name: "jekyll",
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                },
            },
        ],
        output: [
            {
                // tslint:disable-next-line:no-invalid-template-strings
                classifier: "${repo.owner}/${repo.name}/${sha}/site",
                pattern: { directory: "_site" },
            },
        ],
    });
    const mkdocs = container("mkdocs", {
        containers: [
            {
                args: ["build", "--strict"],
                image: "squidfunk/mkdocs-material:3.3.0",
                name: "mkdocs",
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                },
            },
        ],
        output: [
            {
                // tslint:disable-next-line:no-invalid-template-strings
                classifier: "${repo.owner}/${repo.name}/${sha}/site",
                pattern: { directory: "site" },
            },
        ],
    });
    const webpack = container("webpack", {
        containers: [
            {
                args: ["npm ci --progress=false && npm run --if-present compile && npm test"],
                command: ["bash", "-c"],
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
        output: [
            /* tslint:disable:no-invalid-template-strings */
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/node_modules",
                pattern: { directory: "node_modules" },
            },
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/site",
                pattern: { directory: "public" },
            },
            /* tslint:enable:no-invalid-template-strings */
        ],
    });
    const shadowCljsTest = container("shadowcljs-test", {
        containers: [
            {
                args: ["npm ci --progress=false && npm run test"],
                command: ["bash", "-c"],
                env: [{ name: "NODE_ENV", value: "development" }],
                image: "atomist/shadow-cljs:0.1.0",
                name: "shadowcljs-test",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "2048Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "1024Mi",
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
        input: [
            { classifier: "${repo.owner}/${repo.name}/${sha}/node_modules" },
            { classifier: "${repo.owner}/${repo.name}/mvn/cache" },
        ],
        output: [
            {
                classifier: "${repo.owner}/${repo.name}/mvn/cache",
                pattern: { directory: ".m2" },
            },
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/node_modules",
                pattern: { directory: "node_modules" },
            },
        ],
        /* tslint:enable:no-invalid-template-strings */
    });
    const shadowCljs = container("shadowcljs", {
        containers: [
            {
                args: ["npm ci --progress=false && npm run release"],
                command: ["bash", "-c"],
                env: [{ name: "NODE_ENV", value: "development" }],
                image: "atomist/shadow-cljs:0.1.0",
                name: "shadowcljs",
                resources: {
                    limits: {
                        cpu: "2000m",
                        memory: "2048Mi",
                    },
                    requests: {
                        cpu: "1000m",
                        memory: "1024Mi",
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
        input: [
            { classifier: "${repo.owner}/${repo.name}/${sha}/node_modules" },
            { classifier: "${repo.owner}/${repo.name}/mvn/cache" },
        ],
        output: [
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/site",
                pattern: { directory: "public" },
            },
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/server",
                pattern: { globPattern: "functions/lib.js" },
            },
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/server-express",
                pattern: { globPattern: "server/lib.js" },
            },
            {
                classifier: "${repo.owner}/${repo.name}/${sha}/config",
                pattern: { globPattern: "firebase.json" },
            },
        ],
        /* tslint:enable:no-invalid-template-strings */
    });
    const htmlValidator = container("htmlvalidator", {
        containers: [
            {
                args: [
                    "if [[ -d _site ]]; then site=_site; " +
                        "elif [[ -d public ]]; then site=public; vnu_args=--also-check-css; " +
                        "elif [[ -d site ]]; then site=site; vnu_args=--also-check-css; " +
                        `else echo "Unsupported project: site neither '_site' nor 'public'" 1>&2; exit 1; fi; ` +
                        '/vnu-runtime-image/bin/vnu --skip-non-html --also-check-svg $vnu_args "$site"',
                ],
                command: ["/bin/bash", "-c"],
                image: "validator/validator:20.6.30",
                name: "nu",
                resources: {
                    limits: {
                        cpu: "2000m",
                        memory: "1024Mi",
                    },
                    requests: {
                        cpu: "500m",
                        memory: "768Mi",
                    },
                },
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                    readOnlyRootFilesystem: true,
                    runAsGroup: 65534,
                    runAsNonRoot: true,
                    runAsUser: 65534,
                },
            },
        ],
        // tslint:disable-next-line:no-invalid-template-strings
        input: [{ classifier: "${repo.owner}/${repo.name}/${sha}/site" }],
    });
    const htmltest = container("htmltest", {
        containers: [
            {
                args: ["htmltest"],
                image: "wjdp/htmltest:v0.12.0",
                name: "htmltest",
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                },
            },
        ],
        // tslint:disable-next-line:no-invalid-template-strings
        input: [
            { classifier: "${repo.owner}/${repo.name}/${sha}/site" },
            { classifier: "${repo.owner}/${repo.name}/htmltest" },
        ],
        // tslint:disable-next-line:no-invalid-template-strings
        output: [
            {
                classifier: "${repo.owner}/${repo.name}/htmltest",
                pattern: { globPattern: "tmp/.htmltest/refcache.json" },
            },
        ],
    });
    const firebaseImage = "andreysenov/firebase-tools:9.2.2";
    const gcloudSdkImage = "gcr.io/google.com/cloudsdktool/cloud-sdk:325.0.0";
    const [firebaseStagingDeploy, firebaseProductionDeploy] = ["staging", "production"].map(env =>
        container(`firebase-${env}-deploy`, {
            containers: [
                {
                    args: ["firebase", "--non-interactive", `--project=${env}`, "deploy"],
                    image: firebaseImage,
                    name: "firebase",
                },
            ],
            /* tslint:disable:no-invalid-template-strings */
            input: [
                { classifier: "${repo.owner}/${repo.name}/${sha}/node_modules" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/site" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/server" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/config" },
            ],
            /* tslint:disable:no-invalid-template-strings */
        }),
    );
    firebaseProductionDeploy.definition.preApprovalRequired = true;

    const getValueFromPropertiesFile = (propertiesFileContent: string, propertyKey: string): string | undefined => {
        const lines = propertiesFileContent.split("\n");
        for (const line of lines) {
            const parts: string[] = line.split("=");
            if (parts[0] === propertyKey) {
                return parts[1];
            }
        }
        return undefined;
    };

    const [appEngineStagingDeploy, appEngineProductionDeploy] = ["staging", "production"].map(env =>
        container(`appEngine-${env}-deploy`, {
            callback: async (r: ContainerRegistration, p: GitProject) => {
                const file = await p.getFile("atomist-build.properties");
                const fileContent = file ? await file.getContent() : "";
                const googleProjectName =
                    getValueFromPropertiesFile(fileContent, "google-project-name") || "atomist-new-web-app";
                return {
                    containers: [
                        {
                            name: "gcloud-sdk",
                            image: gcloudSdkImage,
                            command: ["/bin/bash", "-c"],
                            args: [
                                /*eslint-disable */
                                "set -ex; " +
                                "export NEWVERSION=$(echo $ATOMIST_VERSION | sed 's|\\.|-|g'); " +
                                `gcloud app deploy app.${env}.yaml --quiet --project=${googleProjectName}-${env} --version=$NEWVERSION; `,
                                /*eslint-enable */
                            ],
                        },
                    ],
                };
            },
            containers: [],
            /* tslint:disable:no-invalid-template-strings */
            input: [
                { classifier: "${repo.owner}/${repo.name}/${sha}/node_modules" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/site" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/server-express" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/config" },
            ],
            /* tslint:disable:no-invalid-template-strings */
        }).withProjectListener(appEngineListener),
    );
    appEngineProductionDeploy.definition.preApprovalRequired = true;

    const incrementVersion = container("increment-version", {
        containers: [
            {
                /* tslint:disable:no-invalid-template-strings */
                args: [
                    "set -ex; " +
                        'git checkout "$ATOMIST_BRANCH" && git pull origin "$ATOMIST_BRANCH"; ' +
                        "if [[ -f VERSION ]]; then " +
                        `v=$(awk -F. '{ p = $3 + 1; print $1 "." $2 "." p }' < VERSION); ` +
                        'echo "$v" > VERSION && git add VERSION; ' +
                        "elif [[ -f package.json ]]; then npm version --no-git-tag-version patch && git add package.json; " +
                        "else echo 'No version file found'; exit 0; fi; " +
                        'printf -v m "Version: increment after release\n\n[atomist:generated]"; ' +
                        'git commit -m "$m" && git push origin "$ATOMIST_BRANCH"',
                ],
                /* tslint:enable:no-invalid-template-strings */
                command: ["/bin/bash", "-c"],
                image: "atomist/sdm-base:0.4.1",
                name: "version",
                resources: {
                    limits: {
                        cpu: "1000m",
                        memory: "256Mi",
                    },
                    requests: {
                        cpu: "100m",
                        memory: "256Mi",
                    },
                },
                securityContext: {
                    allowPrivilegeEscalation: false,
                    privileged: false,
                    runAsGroup: 2866,
                    runAsNonRoot: true,
                    runAsUser: 2866,
                },
            },
        ],
        initContainers: [
            {
                args: ['chown -Rh 2866:2866 "$ATOMIST_PROJECT_DIR"'],
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
    });

    const [runSmokeTestStaging, runSmokeTestProduction] = ["staging", "production"].map(env =>
        container(`Run Smoke Test ${env}`, {
            callback: async (r: ContainerRegistration, p: GitProject) => {
                const file = await p.getFile("atomist-build.properties");
                const fileContent = file ? await file.getContent() : "";
                const sdmConfiguredSmokeTestBaseUrl =
                    env === "production"
                        ? sdm.configuration.sdm.webapp.urls.prod
                        : sdm.configuration.sdm.webapp.urls.staging;
                const propertyKey = `smoke-test-base-url-${env}`;
                const smokeTestBaseUrl =
                    getValueFromPropertiesFile(fileContent, propertyKey) || sdmConfiguredSmokeTestBaseUrl;
                return {
                    containers: [
                        {
                            env: [
                                {
                                    name: "CYPRESS_SMOKE_TEST_BASE_URL",
                                    value: smokeTestBaseUrl,
                                },
                            ],
                            image: "cypress/included:6.1.0",
                            name: "cypress-included",
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
                };
            },
            containers: [],
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

    return {
        none: {
            test: not(repoSlugMatches(/^(?:atomist\/docs|atomisthq\/web-(?:app(?:-cljs)?|site)|atomisthq\/dso-web)$/)),
            goals: none,
        },
        immaterial: {
            test: or(IsReleaseCommit, IsChangelogCommit),
            goals: ImmaterialGoals.andLock(),
        },
        jekyll: {
            test: [JekyllPushTest],
            goals: [queue, version, jekyll, htmltest, [htmlValidator, tag]],
        },
        mkdocs: {
            test: [MkDocsPushTest],
            goals: [queue, version, mkdocs, htmltest, [htmlValidator, tag]],
        },
        shadowCljs: {
            test: repoSlugMatches(/^atomisthq\/web-app-cljs|atomisthq\/dso-web$/),
            goals: [queue, cancel, version, [shadowCljsTest, shadowCljs], tag],
        },
        webpack: {
            test: [WebPackPushTest],
            goals: [queue, version, webpack, htmltest, [htmlValidator, tag]],
        },
        deploy: {
            dependsOn: [tag],
            test: [FirebasePushTest, ToDefaultBranch],
            goals: [firebaseStagingDeploy, firebaseProductionDeploy, releaseTag, incrementVersion],
        },
        deployAppEngine: {
            dependsOn: [tag],
            test: [AppEnginePushTest, ToDefaultBranch],
            goals: [
                appEngineStagingDeploy,
                runSmokeTestStaging,
                appEngineProductionDeploy,
                runSmokeTestProduction,
                releaseTag,
                incrementVersion,
            ],
        },
    };
}, machineOptions);

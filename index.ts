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

import { Tag } from "@atomist/sdm-core/lib/goal/common/Tag";
import { container } from "@atomist/sdm-core/lib/goal/container/container";
import { executeTag } from "@atomist/sdm-core/lib/internal/delivery/build/executeTag";
import { configure } from "@atomist/sdm-core/lib/machine/configure";
import { githubGoalStatusSupport } from "@atomist/sdm-core/lib/pack/github-goal-status/github";
import { goalStateSupport } from "@atomist/sdm-core/lib/pack/goal-state/goalState";
import { k8sGoalSchedulingSupport } from "@atomist/sdm-core/lib/pack/k8s/goalScheduling";
import { gcpSupport } from "@atomist/sdm-pack-gcp/lib/gcp";
import { Cancel } from "@atomist/sdm/lib/api/goal/common/Cancel";
import { ImmaterialGoals } from "@atomist/sdm/lib/api/goal/common/Immaterial";
import { Queue } from "@atomist/sdm/lib/api/goal/common/Queue";
import { ToDefaultBranch } from "@atomist/sdm/lib/api/mapping/support/commonPushTests";
import {
    not,
    or,
} from "@atomist/sdm/lib/api/mapping/support/pushTestUtils";
import { machineOptions } from "./lib/configure";
import { appEngineListener } from "./lib/helpers";
import {
    AppEnginePushTest,
    FirebasePushTest,
    IsChangelogCommit,
    IsReleaseCommit,
    JekyllPushTest,
    repoSlugMatches,
    ShadowCljsPushTest,
    WebPackPushTest,
} from "./lib/pushTest";

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
    const releaseTag = new Tag()
        .with({
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
        output: [{
            // tslint:disable-next-line:no-invalid-template-strings
            classifier: "${repo.owner}/${repo.name}/${sha}/site",
            pattern: { directory: "_site" },
        }],
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
                args: ["npm run release"],
                command: ["bash", "-c"],
                env: [{ name: "NODE_ENV", value: "development" }],
                image: "atomist/shadow-cljs:0.1.0",
                name: "shadowcljs",
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
                    `else echo "Unsupported project: site neither '_site' nor 'public'" 1>&2; exit 1; fi; ` +
                    '/vnu-runtime-image/bin/vnu --skip-non-html --also-check-svg $vnu_args "$site"',
                ],
                command: ["/bin/bash", "-c"],
                image: "validator/validator:latest",
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
        input: [{ classifier: "${repo.owner}/${repo.name}/${sha}/site" }],
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
    const gcloudSdkImage = "google/cloud-sdk:289.0.0";
    const [appEngineStagingDeploy, appEngineProductionDeploy] = ["staging", "production"].map(env => container(
        `appEngine-${env}-deploy`,
        {
            containers: [
                {
                    name: "gcloudSdk",
                    image: gcloudSdkImage,
                    command: ["/bin/bash", "-c"],
                    args: [
                        "set -ex; " +
                        `gcloud app deploy app.${env}.yaml --quiet --project=atomist-new-web-app-${env}; `,
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
        },
    ).withProjectListener(appEngineListener));
    appEngineProductionDeploy.definition.preApprovalRequired = true;
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
            /* tslint:disable:no-invalid-template-strings */
            input: [
                { classifier: "${repo.owner}/${repo.name}/${sha}/node_modules" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/site" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/server" },
                { classifier: "${repo.owner}/${repo.name}/${sha}/config" },
            ],
            /* tslint:disable:no-invalid-template-strings */
        },
    ));
    firebaseProductionDeploy.definition.preApprovalRequired = true;

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
                    "else echo 'No version file found'; exit 1; fi; " +
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

    return {
        immaterial: {
            test: or(IsReleaseCommit, IsChangelogCommit),
            goals: ImmaterialGoals.andLock(),
        },
        webStatic: {
            test: [repoSlugMatches(/^atomisthq\/s3-images$/), ToDefaultBranch],
            goals: [
                queue,
                firebaseDeploy,
            ],
        },
        jekyll: {
            test: [JekyllPushTest],
            goals: [
                queue,
                version,
                jekyll,
                htmltest,
                [htmlValidator, tag],
            ],
        },
        shadowCljs: {
            test: [not(repoSlugMatches(/^(?:atomist-skills\/.*|atomisthq\/admin-app|atomisthq\/.*-skill)$/)), ShadowCljsPushTest],
            goals: [
                queue,
                cancel,
                version,
                shadowCljsTest,
                shadowCljs,
                tag,
            ],
        },
        webpack: {
            test: [WebPackPushTest],
            goals: [
                queue,
                version,
                webpack,
                htmltest,
                [htmlValidator, tag],
            ],
        },
        deploy: {
            dependsOn: [tag],
            test: [not(repoSlugMatches(/^atomisthq\/s3-images$/)), FirebasePushTest, ToDefaultBranch],
            goals: [
                [firebaseStagingDeploy],
                [firebaseProductionDeploy],
                [releaseTag],
                [incrementVersion],
            ],
        },
        deployAppEngine: {
            dependsOn: [tag],
            test: [AppEnginePushTest, ToDefaultBranch],
            goals: [
                appEngineStagingDeploy,
                appEngineProductionDeploy,
                releaseTag,
                incrementVersion,
            ],
        },
    };
}, machineOptions);

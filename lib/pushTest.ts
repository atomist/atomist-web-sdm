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

import { fileExists } from "@atomist/automation-client/lib/project/util/projectUtils";
import { predicatePushTest, pushTest, PushTest } from "@atomist/sdm/lib/api/mapping/PushTest";
import { hasFile } from "@atomist/sdm/lib/api/mapping/support/commonPushTests";

/** Test for Firebase configuration file in project. */
export const FirebasePushTest = predicatePushTest("HasFirebaseConfiguration", async p =>
    fileExists(p, "firebase*.json"),
);

/** Test for AppEngine configuration file in project. */
export const AppEnginePushTest = predicatePushTest("HasAppEngineConfiguration", async p =>
    fileExists(p, ["app.yaml", "app.*.yaml"]),
);

/** Test for Jekyll configuration file in project. */
export const JekyllPushTest = hasFile("_config.yml");

/** Test for MkDocs configuration file in project. */
export const MkDocsPushTest = hasFile("mkdocs.yml");

/** Test for webpack configuration file in project. */
export const WebPackPushTest = hasFile("webpack.config.js");

/**
 * Return a push test that matches the repository owner/repo slug
 * against regular expression.
 *
 * @param re Regular expression to match against using RegExp.test()
 * @return Push test performing the match
 */
export function repoSlugMatches(re: RegExp): PushTest {
    return pushTest(`Project owner/name slug matches regular expression ${re.toString()}`, async pci =>
        re.test(`${pci.id.owner}/${pci.id.repo}`),
    );
}

/**
 * Push test detecting if the after commit of the push is related to a
 * release.
 */
export const IsReleaseCommit: PushTest = {
    name: "IsReleaseCommit",
    mapping: async pi => {
        const versionRegexp = /Version: increment after .*release/i;
        const changelogRegexp = /Changelog: add release .*/i;
        const commitMessage = pi.push.after && pi.push.after.message ? pi.push.after.message : "";
        return versionRegexp.test(commitMessage) || changelogRegexp.test(commitMessage);
    },
};

export const IsChangelogCommit: PushTest = {
    name: "IsChangelogCommit",
    mapping: async pi => {
        const commitMessage = pi.push.after && pi.push.after.message ? pi.push.after.message : "";
        const changelogCommitRegexp = /^Changelog:.* to /i;
        return changelogCommitRegexp.test(commitMessage);
    },
};

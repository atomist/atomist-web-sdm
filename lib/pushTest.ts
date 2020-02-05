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

import { projectUtils } from "@atomist/automation-client";
import {
    hasFile,
    predicatePushTest,
    pushTest,
    PushTest,
} from "@atomist/sdm";

/** Test for Firebase configuration file in project. */
export const FirebasePushTest = predicatePushTest(
    "HasFirebaseConfiguration",
    async p => projectUtils.fileExists(p, ["firebase.json", "firebase.dev.json", "firebase.prod.json"]));

/** Test for Jekyll configuration file in project. */
export const JekyllPushTest = hasFile("_config.yml");

/** Test for shadow-cljs configuration file in project. */
export const ShadowCljsPushTest = hasFile("shadow-cljs.edn");

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
    return pushTest(`Project owner/name slug matches regular expression ${re.toString()}`,
        async pci => re.test(`${pci.id.owner}/${pci.id.repo}`));
}

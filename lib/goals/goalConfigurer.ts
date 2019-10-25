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
    executeTag,
    GoalConfigurer,
} from "@atomist/sdm-core";
import { singleIssuePerCategoryManaging } from "@atomist/sdm-pack-issue";
import {
    FileVersionerRegistration,
    FileVersionIncrementerRegistration,
    GitHubReleaseRegistration,
} from "@atomist/sdm-pack-version";
import {
    runHtmlValidator,
    SiteLocationToSourceLocation,
} from "@atomist/sdm-pack-web";
import { DefaultName } from "../configure";
import { siteCacheRestore } from "./goalCreator";
import { AtomistWebSdmGoals } from "./goals";
import {
    JekyllPushTest,
    repoSlugMatches,
} from "./pushTests";

/**
 * Configure the SDM and add fulfillments or listeners to the created goals.
 */
export const AtomistClientSdmGoalConfigurer: GoalConfigurer<AtomistWebSdmGoals> = async (sdm, goals) => {
    goals.version
        .with(FileVersionerRegistration);
    goals.codeInspection
        .with({
            name: "JekyllHtmlValidator",
            inspection: runHtmlValidator({ sitePath: "_site", siteToSource: jekyllSiteToSource() }),
            pushTest: JekyllPushTest,
        })
        .withProjectListener(siteCacheRestore(JekyllPushTest))
        .withListener(singleIssuePerCategoryManaging(sdm.configuration.name || DefaultName, false));
    goals.fetchStaging
        .with({
            url: "https://atomist.services/",
            pushTest: repoSlugMatches(/^atomisthq\/web-site$/),
        });
    goals.fetchProduction
        .with({
            url: "https://atomist.com/",
            pushTest: repoSlugMatches(/^atomisthq\/web-site$/),
        });
    goals.releaseTag
        .with({
            name: "release-tag",
            goalExecutor: executeTag({ release: true }),
        });
    goals.release
        .with(GitHubReleaseRegistration);
    goals.incrementVersion
        .with(FileVersionIncrementerRegistration);
};

/**
 * There is no consistent way to map location in a HTML file to its
 * Jekyll source, which may be Markdown.
 */
function jekyllSiteToSource(src: string = ""): SiteLocationToSourceLocation {
    return async (s, p) => {
        let srcPath = s.path.replace(/^_site\//, src);
        if (!await p.hasFile(srcPath) && srcPath.endsWith(".html")) {
            const mdPath = srcPath.replace(/\.html$/, ".md");
            if (await p.hasFile(mdPath)) {
                srcPath = mdPath;
            }
        }
        return {
            ...s,
            path: srcPath,
            offset: 0,
            lineFrom1: 1,
            columnFrom1: 1,
        };
    };
}

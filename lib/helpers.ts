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

import {GoalProjectListenerEvent, GoalProjectListenerRegistration} from "@atomist/sdm/lib/api/goal/GoalInvocation";

export const extractAppEngineUrl = (input: string) => {
    const re = /Deployed service \[\w+\] to \[(.*)\]/;
    const match = re.exec(input);
    return match ? match[1] : undefined;
};

export const appEngineListener: GoalProjectListenerRegistration = {
    name: "AppEngineListener",
    events: [GoalProjectListenerEvent.after],
    listener: async (p, r) => {
        let data = {};
        if (r.progressLog.log) {
            const url = extractAppEngineUrl(r.progressLog.log);
            if (url) {
                data = {
                    externalUrls: [{url}],
                };
            }
        }
        return data;
    },
};

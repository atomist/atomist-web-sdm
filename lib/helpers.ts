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

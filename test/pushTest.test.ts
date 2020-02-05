import {InMemoryProject} from "@atomist/automation-client";
import * as assert from "power-assert";
import {FirebasePushTest} from "../lib/pushTest";

describe ("pushTests", () => {
    describe ("FirebaseConfiguration", () => {
        it ("should return false when config is missing", async () => {
            const p = InMemoryProject.of();
            const result = await FirebasePushTest.predicate(p);
            assert(!result);
        });
        it ("should return true when firebase.json is present", async () => {
            const p = InMemoryProject.of({path: "firebase.json", content: ""});
            const result = await FirebasePushTest.predicate(p);
            assert(result);
        });
        it ("should return true when firebase.dev.json is present", async () => {
            const p = InMemoryProject.of({path: "firebase.dev.json", content: ""});
            const result = await FirebasePushTest.predicate(p);
            assert(result);
        });
        it ("should return true when firebase.prod.json is present", async () => {
            const p = InMemoryProject.of({path: "firebase.prod.json", content: ""});
            const result = await FirebasePushTest.predicate(p);
            assert(result);
        });
    });
});

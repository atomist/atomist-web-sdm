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

import { InMemoryProject } from "@atomist/automation-client";
import * as assert from "power-assert";
import { FirebasePushTest } from "../lib/pushTest";

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

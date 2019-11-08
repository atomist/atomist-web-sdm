/*
 * Copyright © 2018 Atomist, Inc.
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
import { jekyllSiteToSource } from "../lib/goalConfigurer";

describe("goalConfigurer", () => {

    describe("jekyllSiteToSource", () => {

        it("removes _site by default", async () => {
            const p = InMemoryProject.of();
            const s = { path: "_site/index.html", offset: 0 };
            const r = await jekyllSiteToSource()(s, p);
            const e = { path: "index.html", offset: 0 };
            assert.deepStrictEqual(r, e);
        });

        it("respects provided source path", async () => {
            const p = InMemoryProject.of();
            const s = { path: "_site/index.html", offset: 10 };
            const r = await jekyllSiteToSource("src/")(s, p);
            const e = { path: "src/index.html", offset: 10 };
            assert.deepStrictEqual(r, e);
        });

        it("retains locations", async () => {
            const p = InMemoryProject.of();
            const s = { path: "_site/index.html", offset: 10, columnFrom1: 11, lineFrom1: 3 };
            const r = await jekyllSiteToSource()(s, p);
            const e = { path: "index.html", offset: 10, columnFrom1: 11, lineFrom1: 3 };
            assert.deepStrictEqual(r, e);
        });

        it("finds markdown source", async () => {
            const p = InMemoryProject.of({ path: "about.md", content: "# About\n" });
            const s = { path: "_site/about.html", offset: 3 };
            const r = await jekyllSiteToSource()(s, p);
            const e = { path: "about.md", offset: 3 };
            assert.deepStrictEqual(r, e);
        });

    });

});

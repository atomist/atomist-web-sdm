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

import * as assert from "power-assert";
import { extractAppEngineUrl } from "../lib/helpers";

describe("appEngineTests", () => {
    it("should extract app engine url from deployment output", () => {
        const result = extractAppEngineUrl(output);
        assert.strictEqual(result, "https://some-thing-goes-here.app.com");
    });
    it("should return undefined when not found", () => {
        const result = extractAppEngineUrl("Some garbage goes here");
        assert.strictEqual(result, undefined);

    });
});

const output = `
Services to deploy:

descriptor:      [/atm/home/app.yaml]
source:          [/atm/home]
target project:  [my-project-staging]
target service:  [default]
target version:  [someversion]
target url:      [https://some-thing-goes-here.app.com]


Beginning deployment of service [default]...
╔════════════════════════════════════════════════════════════╗
╠═ Uploading 2 files to Google Cloud Storage                ═╣
╚════════════════════════════════════════════════════════════╝
File upload done.
Deployed service [default] to [https://some-thing-goes-here.app.com]

You can stream logs from the command line by running:
  $ gcloud app logs tail -s default

To view your application in the web browser run:
  $ gcloud app browse --project=my-staging-project
`;

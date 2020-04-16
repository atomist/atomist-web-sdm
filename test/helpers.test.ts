import * as assert from "power-assert";
import {extractAppEngineUrl} from "../lib/helpers";

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

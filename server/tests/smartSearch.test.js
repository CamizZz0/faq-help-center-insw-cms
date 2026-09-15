import assert from "node:assert/strict";
import test from "node:test";

import {
    createSearchPlan,
    getSearchSuggestions,
} from "../src/utils/smartSearch.js";

test("membetulkan salah ketik dan memperluas singkatan layanan", () => {
    const plan = createSearchPlan("traking pib");

    assert.equal(plan.correctedQuery, "tracking pib");
    assert.ok(plan.terms.includes("tracking"));
    assert.ok(plan.terms.includes("pelacakan"));
    assert.ok(plan.terms.includes("pemberitahuan impor barang"));
});

test("menyediakan saran pencarian yang relevan", () => {
    const suggestions = getSearchSuggestions("pertekk");

    assert.ok(suggestions.includes("PERTEK"));
    assert.equal(suggestions.length, 3);
});

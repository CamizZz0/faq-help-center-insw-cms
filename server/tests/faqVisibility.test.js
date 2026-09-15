import assert from "node:assert/strict";
import test from "node:test";

import {
    FAQ_VISIBILITIES,
    VIEWER_ROLES,
    canViewerSeeFaq,
    normalizeVisibility,
    normalizeViewerRole,
    visibleVisibilitiesForRole,
    getLockedMetadata,
    getVisibilityCounts,
} from "../src/utils/faqVisibility.js";

const matrix = [
    ["public", true, "guest", true],
    ["public", true, "authenticated", true],
    ["public", false, "guest", false],
    ["public", false, "authenticated", false],

    ["authenticated", true, "guest", false],
    ["authenticated", true, "authenticated", true],
    ["authenticated", false, "guest", false],
    ["authenticated", false, "authenticated", false],
];

test("visibility x isPublished x role matrix", async (t) => {
    for (const [visibility, isPublished, role, expected] of matrix) {
        await t.test(`${visibility} / published=${isPublished} / ${role} => ${expected}`, () => {
            assert.equal(
                canViewerSeeFaq({ visibility, isPublished }, role),
                expected,
            );
        });
    }
});

test("FAQ public lama (tanpa field visibility) tetap tampil untuk guest", () => {
    assert.equal(canViewerSeeFaq({ isPublished: true }, "guest"), true);
    assert.equal(
        canViewerSeeFaq({ visibility: undefined, isPublished: true }, "guest"),
        true,
    );
    assert.equal(
        canViewerSeeFaq({ visibility: "PUBLIC", isPublished: true }, "guest"),
        true,
    );
});

test("normalizeVisibility default ke public untuk nilai tak dikenal", () => {
    assert.equal(normalizeVisibility(undefined), "public");
    assert.equal(normalizeVisibility(""), "public");
    assert.equal(normalizeVisibility("rahasia"), "public");
    assert.equal(normalizeVisibility("Authenticated"), "authenticated");
    assert.deepEqual([...FAQ_VISIBILITIES], [
        "public",
        "authenticated",
    ]);
});

test("normalizeViewerRole default ke guest (paling restriktif)", () => {
    assert.equal(normalizeViewerRole(undefined), "guest");
    assert.equal(normalizeViewerRole("superadmin"), "guest");
    assert.equal(normalizeViewerRole("Admin"), "guest");
    assert.deepEqual([...VIEWER_ROLES], ["guest", "authenticated"]);
});

test("visibleVisibilitiesForRole memetakan role ke daftar visibility", () => {
    assert.deepEqual(visibleVisibilitiesForRole("guest"), ["public"]);
    assert.deepEqual(visibleVisibilitiesForRole("authenticated"), [
        "public",
        "authenticated",
    ]);
    assert.deepEqual(visibleVisibilitiesForRole("admin"), ["public"]);
});

const demoList = [
    { id: 1, question: "Q public", visibility: "public", isPublished: true },
    { id: 2, question: "Q auth", visibility: "authenticated", isPublished: true },
    { id: 3, question: "Q draft", visibility: "authenticated", isPublished: false },
];

test("getVisibilityCounts menghitung public/authenticated/draft", () => {
    assert.deepEqual(getVisibilityCounts(demoList), {
        public: 1,
        authenticated: 1,
        draft: 1,
        total: 3,
    });
});

test("getLockedMetadata tidak pernah memuat answer", () => {
    for (const role of VIEWER_ROLES) {
        const locked = getLockedMetadata(demoList, role);

        for (const item of locked) {
            assert.equal("answer" in item, false);
            assert.ok(item.question);
            assert.ok(item.teaser);
        }
    }

    assert.equal(getLockedMetadata(demoList, "guest").length, 2);
    assert.equal(getLockedMetadata(demoList, "authenticated").length, 1);
    assert.equal(getLockedMetadata(demoList, "admin").length, 2);
});

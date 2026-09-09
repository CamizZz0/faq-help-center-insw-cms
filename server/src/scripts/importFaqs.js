import "dotenv/config";
import fs from "node:fs/promises";
import sanitizeHtml from "sanitize-html";
import {
    eq,
    or,
} from "drizzle-orm";

import {
    db,
    pool,
} from "../config/db.js";

import {
    subcategories,
    faqTopics,
    faqs,
} from "../models/schema.js";

const importSources = [
    {
        fileName: "pib.json",
        subcategorySlug: "pib",

        topicNameMapping: {
            "Penjelasan PIB": {
                name: "Pendahuluan PIB",
                slug: "pendahuluan-pib",
            },

            "Tracking PIB": {
                name: "Tracking PIB",
                slug: "tracking-pib",
            },

            "Reject Dokumen": {
                name: "Reject Dokumen",
                slug: "reject-dokumen-pib",
            },
        },
    },

    {
        fileName: "do-online-sp2.json",
        subcategorySlug: "do-online-sp2",

        topicNameMapping: {
            "SP2 Online": {
                name: "SP2 Online",
                slug: "sp2-online",
            },

            "DO ONLINE": {
                name: "DO Online",
                slug: "do-online",
            },
        },
    },

    {
        fileName: "ssm-qc-impor-ekspor.json",
        subcategorySlug: "ssm-qc-impor-ekspor",

        topicNameMapping: {
            "Ketentuan Umum": {
                name: "Ketentuan Umum",
                slug: "ketentuan-umum-ssm-qc",
            },

            "Registrasi Akun": {
                name: "Registrasi Akun",
                slug: "registrasi-akun-ssm-qc",
            },

            "Aplikasi": {
                name: "Aplikasi",
                slug: "aplikasi-ssm-qc",
            },
        },
    },

    {
        fileName: "btki-2022.json",
        subcategorySlug: "btki-2022",

        topicNameMapping: {
            "Perizinan dan Rekomendasi": {
                name: "Perizinan dan Rekomendasi",
                slug: "perizinan-rekomendasi-btki-2022",
            },

            "Modul PIB dan PEB": {
                name: "Modul PIB dan PEB",
                slug: "modul-pib-peb-btki-2022",
            },

            "Informasi Umum": {
                name: "Informasi Umum",
                slug: "informasi-umum-btki-2022",
            },

            "e-COO": {
                name: "e-COO",
                slug: "e-coo-btki-2022",
            },

            "Fasilitas": {
                name: "Fasilitas",
                slug: "fasilitas-btki-2022",
            },

            "Penelusuran tabel korelasi": {
                name: "Penelusuran Tabel Korelasi",
                slug: "penelusuran-tabel-korelasi-btki-2022",
            },
        },
    },

    {
        fileName: "modul-pertek-rekom.json",
        subcategorySlug: "modul-pertek-rekom",

        topicNameMapping: {
            "Pengisian data pada sistem INSW": {
                name: "Pengisian Data pada Sistem INSW",
                slug: "pengisian-data-insw-pertek-rekom",
            },
        },
    },

    {
        fileName: "peb.json",
        subcategorySlug: "peb",
        topicMapping: {
            "Penjelasan PEB": {
                name: "Pendahuluan PEB",
                slug: "pendahuluan-peb",
            },
            "Tracking PEB": {
                name: "Tracking PEB",
                slug: "tracking-peb",
            },
            "Reject Dokumen": {
                name: "Reject Dokumen PEB",
                slug: "reject-dokumen-peb",
            },
        },
    },
    {
        fileName: "coo-ska.json",
        subcategorySlug: "coo-ska",
        topicMapping: {
            "Penjelasan COO": {
                name: "Pendahuluan COO/SKA",
                slug: "pendahuluan-coo-ska",
            },
            "Tracking e-COO": {
                name: "Tracking e-COO",
                slug: "tracking-e-coo",
            },
        },
    },
];

function createSlug(value = "") {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/&/g, " dan ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function cleanAnswer(html) {
    return sanitizeHtml(html || "", {
        allowedTags: [
            "p",
            "br",
            "strong",
            "b",
            "em",
            "i",
            "ul",
            "ol",
            "li",
            "a",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
        ],

        allowedAttributes: {
            a: [
                "href",
                "target",
                "rel",
            ],
            table: ["class"],
            th: [
                "colspan",
                "rowspan",
            ],
            td: [
                "colspan",
                "rowspan",
            ],
        },

        allowedSchemes: [
            "http",
            "https",
            "mailto",
        ],

        transformTags: {
            a: (tagName, attributes) => ({
                tagName,
                attribs: {
                    ...attributes,
                    target: "_blank",
                    rel: "noopener noreferrer",
                },
            }),
        },
    });
}

async function findLocalSubcategory(
    tx,
    subcategorySlug
) {
    const [subcategory] = await tx
        .select({
            id: subcategories.id,
            slug: subcategories.slug,
        })
        .from(subcategories)
        .where(
            eq(
                subcategories.slug,
                subcategorySlug
            )
        )
        .limit(1);

    return subcategory;
}

async function saveTopic(
    tx,
    {
        sourceTopic,
        localSubcategory,
        mappedTopic,
        topicIndex,
    }
) {
    const sourceId =
        sourceTopic.kd_subkategori_faq;

    const existingCondition =
        sourceId !== null &&
            sourceId !== undefined
            ? or(
                eq(
                    faqTopics.sourceId,
                    sourceId
                ),
                eq(
                    faqTopics.slug,
                    mappedTopic.slug
                )
            )
            : eq(
                faqTopics.slug,
                mappedTopic.slug
            );

    const [existingTopic] = await tx
        .select({
            id: faqTopics.id,
        })
        .from(faqTopics)
        .where(existingCondition)
        .limit(1);

    const topicValues = {
        sourceId,
        subcategoryId:
            localSubcategory.id,
        name: mappedTopic.name,
        slug: mappedTopic.slug,
        description: `Informasi mengenai ${mappedTopic.name}.`,
        sortOrder: topicIndex + 1,
        isActive: true,
        updatedAt: new Date(),
    };

    if (existingTopic) {
        const [updatedTopic] = await tx
            .update(faqTopics)
            .set(topicValues)
            .where(
                eq(
                    faqTopics.id,
                    existingTopic.id
                )
            )
            .returning({
                id: faqTopics.id,
            });

        return updatedTopic;
    }

    const [insertedTopic] = await tx
        .insert(faqTopics)
        .values(topicValues)
        .returning({
            id: faqTopics.id,
        });

    return insertedTopic;
}

async function saveFaq(
    tx,
    {
        sourceFaq,
        savedTopic,
        faqIndex,
    }
) {
    const sourceId =
        sourceFaq.id_pusatbantuan;

    if (
        sourceId === null ||
        sourceId === undefined
    ) {
        throw new Error(
            "FAQ sumber tidak mempunyai id_pusatbantuan."
        );
    }

    const question = String(
        sourceFaq.header ||
        sourceFaq.ur ||
        ""
    ).trim();

    if (!question) {
        throw new Error(
            `FAQ sourceId ${sourceId} tidak mempunyai pertanyaan.`
        );
    }

    const faqValues = {
        sourceId,
        topicId: savedTopic.id,
        question,
        answer: cleanAnswer(
            sourceFaq.jawaban ||
            sourceFaq.ur ||
            ""
        ),
        isPopular: false,
        sortOrder: faqIndex + 1,
        isPublished: true,
        updatedAt: new Date(),
    };
    const [existingFaq] = await tx
        .select({
            id: faqs.id,
        })
        .from(faqs)
        .where(eq(faqs.sourceId, sourceId))
        .limit(1);

    if (existingFaq) {
        await tx
            .update(faqs)
            .set(faqValues)
            .where(
                eq(
                    faqs.id,
                    existingFaq.id
                )
            );

        return;
    }

    await tx
        .insert(faqs)
        .values(faqValues);
}

async function importFaqs() {
    let importedSubcategories = 0;
    let importedTopics = 0;
    let importedFaqs = 0;

    try {
        await db.transaction(
            async (tx) => {
                for (const importSource of importSources) {
                    const filePath = new URL(
                        `../data/import/${importSource.fileName}`,
                        import.meta.url
                    );

                    const fileContent =
                        await fs.readFile(
                            filePath,
                            "utf-8"
                        );

                    const payload =
                        JSON.parse(fileContent);

                    if (
                        payload.code !== "01" ||
                        !Array.isArray(
                            payload.data
                        )
                    ) {
                        throw new Error(
                            `Format file ${importSource.fileName} tidak valid.`
                        );
                    }

                    const localSubcategory =
                        await findLocalSubcategory(
                            tx,
                            importSource.subcategorySlug
                        );

                    if (!localSubcategory) {
                        throw new Error(
                            `Subkategori "${importSource.subcategorySlug}" belum tersedia. Jalankan seed terlebih dahulu.`
                        );
                    }

                    for (
                        const sourceSubcategory
                        of payload.data
                    ) {
                        await tx
                            .update(subcategories)
                            .set({
                                sourceId:
                                    sourceSubcategory.kd_kategori_faq,
                                updatedAt:
                                    new Date(),
                            })
                            .where(
                                eq(
                                    subcategories.id,
                                    localSubcategory.id
                                )
                            );

                        importedSubcategories += 1;

                        const sourceTopics =
                            Array.isArray(
                                sourceSubcategory.subkategori
                            )
                                ? sourceSubcategory.subkategori
                                : [];

                        for (
                            const [
                                topicIndex,
                                sourceTopic,
                            ] of sourceTopics.entries()
                        ) {
                            const faqList =
                                Array.isArray(
                                    sourceTopic.listFaq
                                )
                                    ? sourceTopic.listFaq
                                    : [];

                            if (
                                faqList.length === 0
                            ) {
                                continue;
                            }

                            const mappedTopic =
                                importSource.topicNameMapping?.[sourceTopic.ur] ?? {
                                    name: sourceTopic.ur,
                                    slug: `${importSource.subcategorySlug}-topik-${sourceTopic.kd_subkategori_faq}`,
                                };

                            const savedTopic =
                                await saveTopic(
                                    tx,
                                    {
                                        sourceTopic,
                                        localSubcategory,
                                        mappedTopic,
                                        topicIndex,
                                    }
                                );

                            importedTopics += 1;

                            for (
                                const [
                                    faqIndex,
                                    sourceFaq,
                                ] of faqList.entries()
                            ) {
                                await saveFaq(
                                    tx,
                                    {
                                        sourceFaq,
                                        savedTopic,
                                        faqIndex,
                                    }
                                );

                                importedFaqs += 1;
                            }
                        }
                    }

                    console.log(
                        `Selesai memproses ${importSource.fileName}`
                    );
                }
            }
        );

        console.log(
            "Import seluruh FAQ berhasil."
        );

        console.log(
            `Subkategori diproses: ${importedSubcategories}`
        );

        console.log(
            `Topik diproses: ${importedTopics}`
        );

        console.log(
            `FAQ diproses: ${importedFaqs}`
        );
    } catch (error) {
        console.error(
            "Import FAQ gagal:",
            error
        );

        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

importFaqs();
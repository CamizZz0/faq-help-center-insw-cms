import {
    pgTable,
    serial,
    varchar,
    text,
    integer,
    boolean,
    timestamp,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 150 }).notNull(),

    slug: varchar("slug", { length: 150 }).notNull().unique(),

    description: text("description"),

    icon: varchar("icon", { length: 100 }),

    sortOrder: integer("sort_order").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

export const subcategories = pgTable("subcategories", {
    id: serial("id").primaryKey(),

    sourceId: integer("source_id").unique(),

    categoryId: integer("category_id")
        .notNull()
        .references(() => categories.id, {
            onDelete: "cascade",
        }),

    name: varchar("name", { length: 150 }).notNull(),

    slug: varchar("slug", { length: 150 }).notNull().unique(),

    description: text("description"),

    icon: varchar("icon", { length: 100 }),

    sortOrder: integer("sort_order").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

export const faqTopics = pgTable("faq_topics", {
    id: serial("id").primaryKey(),

    sourceId: integer("source_id").unique(),

    subcategoryId: integer("subcategory_id")
        .notNull()
        .references(() => subcategories.id, {
            onDelete: "cascade",
        }),

    name: varchar("name", { length: 150 }).notNull(),

    slug: varchar("slug", { length: 150 }).notNull().unique(),

    description: text("description"),

    sortOrder: integer("sort_order").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

export const faqs = pgTable("faqs", {
    id: serial("id").primaryKey(),

    sourceId: integer("source_id").unique(),

    topicId: integer("topic_id")
        .notNull()
        .references(() => faqTopics.id, {
            onDelete: "cascade",
        }),

    question: text("question").notNull(),

    answer: text("answer").notNull(),

    isPopular: boolean("is_popular").notNull().default(false),

    sortOrder: integer("sort_order").notNull().default(0),

    isPublished: boolean("is_published").notNull().default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

export const guides = pgTable("guides", {
    id: serial("id").primaryKey(),

    sourceId: integer("source_id").unique(),

    categoryId: integer("category_id")
        .references(() => categories.id, {
            onDelete: "set null",
        }),

    title: varchar("title", {
        length: 200,
    }).notNull(),

    slug: varchar("slug", {
        length: 200,
    })
        .notNull()
        .unique(),

    description: text("description"),

    fileUrl: text("file_url").notNull(),

    thumbnailUrl: text("thumbnail_url"),

    sortOrder: integer("sort_order")
        .notNull()
        .default(0),

    isPublished: boolean("is_published")
        .notNull()
        .default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

export const tutorials = pgTable("tutorials", {
    id: serial("id").primaryKey(),

    sourceId: integer("source_id").unique(),

    categoryId: integer("category_id")
        .references(() => categories.id, {
            onDelete: "set null",
        }),

    title: varchar("title", {
        length: 200,
    }).notNull(),

    slug: varchar("slug", {
        length: 200,
    })
        .notNull()
        .unique(),

    description: text("description"),

    videoUrl: text("video_url").notNull(),

    thumbnailUrl: text("thumbnail_url"),

    durationSeconds: integer("duration_seconds"),

    sortOrder: integer("sort_order")
        .notNull()
        .default(0),

    isPublished: boolean("is_published")
        .notNull()
        .default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});
WITH normalized AS (
	SELECT
		"id",
		left(trim(both '_' from regexp_replace(lower("user_name"), '[^a-z0-9_]+', '_', 'g')), 30) AS base_name,
		row_number() OVER (
			PARTITION BY left(trim(both '_' from regexp_replace(lower("user_name"), '[^a-z0-9_]+', '_', 'g')), 30)
			ORDER BY "created_at", "id"
		) AS duplicate_number
	FROM "users"
),
renamed AS (
	SELECT
		"id",
		CASE
			WHEN base_name = '' THEN 'user_' || left(replace("id"::text, '-', ''), 16)
			WHEN duplicate_number > 1 THEN left(base_name, 13) || '_' || left(replace("id"::text, '-', ''), 16)
			WHEN length(base_name) < 3 THEN base_name || '_user'
			ELSE base_name
		END AS user_name
	FROM normalized
)
UPDATE "users"
SET "user_name" = renamed.user_name
FROM renamed
WHERE "users"."id" = renamed."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_name_lower_unique" ON "users" (lower("user_name"));
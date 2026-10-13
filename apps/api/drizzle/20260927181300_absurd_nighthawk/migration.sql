CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"email" varchar(255) NOT NULL UNIQUE,
	"user_name" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"avatar_url" varchar(512),
	"provider" varchar(255),
	"provider_id" varchar(255),
	"refresh_token_hash" varchar(255),
	"password_reset_token_hash" varchar(255),
	"password_reset_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'checking' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`month` text NOT NULL,
	`amount` real NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budgets_month_idx` ON `budgets` (`month`);--> statement-breakpoint
CREATE INDEX `budgets_category_month_idx` ON `budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`is_essential` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `categories_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`merchant` text,
	`note` text,
	`date` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transactions_account_date_idx` ON `transactions` (`account_id`,`date`);--> statement-breakpoint
CREATE INDEX `transactions_category_date_idx` ON `transactions` (`category_id`,`date`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);
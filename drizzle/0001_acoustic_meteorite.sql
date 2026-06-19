CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(32) NOT NULL,
	`message` text NOT NULL,
	`serverLabel` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serverId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serverId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`country` varchar(64) NOT NULL,
	`countryCode` varchar(8) NOT NULL,
	`flag` varchar(16) NOT NULL,
	`city` varchar(64) NOT NULL,
	`region` enum('Americas','Europe','Asia-Pacific') NOT NULL,
	`baseLatency` int NOT NULL,
	`baseLoad` int NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`isPremium` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `servers_id` PRIMARY KEY(`id`),
	CONSTRAINT `servers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serverId` int NOT NULL,
	`protocol` varchar(32) NOT NULL,
	`assignedIp` varchar(64) NOT NULL,
	`bytesUp` bigint NOT NULL DEFAULT 0,
	`bytesDown` bigint NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`protocol` enum('WireGuard','OpenVPN','IKEv2') NOT NULL DEFAULT 'WireGuard',
	`killSwitch` boolean NOT NULL DEFAULT true,
	`autoConnect` boolean NOT NULL DEFAULT false,
	`dnsLeakProtection` boolean NOT NULL DEFAULT true,
	`splitTunnelApps` text NOT NULL DEFAULT ('[]'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);

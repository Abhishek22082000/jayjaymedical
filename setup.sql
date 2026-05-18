-- Run this once in phpMyAdmin (http://localhost/phpmyadmin) or via MySQL CLI.

CREATE DATABASE IF NOT EXISTS medical
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE medical;

CREATE TABLE IF NOT EXISTS tablets (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_name         VARCHAR(150)  NOT NULL,
    tablet_name         VARCHAR(150)  NOT NULL,
    manufacturer        VARCHAR(150)  NOT NULL DEFAULT '',
    batch_number        VARCHAR(100)  NOT NULL,
    quantity            INT UNSIGNED  NOT NULL DEFAULT 0,
    start_date          DATE          NOT NULL,
    manufacturing_date  DATE          NULL,
    end_date            DATE          NOT NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tablet_name  (tablet_name),
    INDEX idx_client_name  (client_name),
    INDEX idx_manufacturer (manufacturer),
    INDEX idx_end_date     (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

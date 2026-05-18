-- Run ONCE in phpMyAdmin (SQL tab) on the existing `medical` database.
-- Adds quantity, manufacturer, and manufacturing_date columns.

USE medical;

ALTER TABLE tablets
    ADD COLUMN manufacturer       VARCHAR(150) NOT NULL DEFAULT '' AFTER tablet_name,
    ADD COLUMN quantity           INT UNSIGNED NOT NULL DEFAULT 0  AFTER batch_number,
    ADD COLUMN manufacturing_date DATE         NULL                AFTER start_date,
    ADD INDEX idx_manufacturer (manufacturer);

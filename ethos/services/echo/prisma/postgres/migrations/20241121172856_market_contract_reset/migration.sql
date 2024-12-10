-- This migration is used to reset the market data for all profiles, given the new market contracts.
TRUNCATE TABLE markets RESTART IDENTITY CASCADE;

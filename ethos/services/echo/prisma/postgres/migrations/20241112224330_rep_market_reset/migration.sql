-- This migration is used to reset the market data for all profiles, given the new market contracts.
DELETE FROM market_vote_events;
DELETE FROM market_events;
DELETE FROM markets;

TRUNCATE TABLE market_vote_events RESTART IDENTITY;
TRUNCATE TABLE market_events RESTART IDENTITY;
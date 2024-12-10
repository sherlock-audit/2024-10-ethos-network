-- AlterEnum
ALTER TYPE "XpPointsHistoryItemType" ADD VALUE 'CONTRIBUTION';

-- Commit the transaction to ensure the new enum value is available
COMMIT;

-- Empty table before inserting data
TRUNCATE TABLE xp_points_history RESTART IDENTITY;

-- Insert completed contributions into xp_points_history
INSERT INTO xp_points_history ("profileId", points, type, metadata, "createdAt")
SELECT
  cb."profileId",
  c.experience,
  'CONTRIBUTION' AS type,
  jsonb_build_object('id', c.id, 'type', 'contribution', 'subType', c.type) AS metadata,
  cb."createdAt" AS "createdAt"
FROM
  contributions c
JOIN
  contribution_bundles cb ON c."contributionBundleId" = cb.id
WHERE
  c.status = 'COMPLETED';

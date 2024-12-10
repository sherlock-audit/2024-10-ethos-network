CREATE VIEW "activities" AS
WITH RECURSIVE
    PARTIAL_TABLE (
        ID,
        PARENTID,
        "authorProfileId",
        "rootParentId",
        CONTRACT
    ) AS (
        SELECT
            REPLIES.ID,
            REPLIES."parentId",
            REPLIES."authorProfileId",
            REPLIES."parentId" AS "rootParentId",
            REPLIES.CONTRACT
        FROM
            REPLIES
        UNION
        SELECT
            CHILD.ID,
            CHILD."parentId",
            CHILD."authorProfileId",
            PARTIAL_TABLE."rootParentId" AS "rootParentId",
            PARTIAL_TABLE.CONTRACT
        FROM
            REPLIES AS CHILD
            JOIN PARTIAL_TABLE ON PARTIAL_TABLE.ID = CHILD."parentId"
        WHERE
            CHILD.CONTRACT = 'discussion'
    ),
    TOTAL_REPLIES AS (
        SELECT
            COUNT(*) AS REPLIES,
            "rootParentId",
            CONTRACT
        FROM
            PARTIAL_TABLE
        WHERE
            CONTRACT != 'discussion'
        GROUP BY
            "rootParentId",
            CONTRACT
    ),
    TOTAL_VOTES AS (
        SELECT
            CONTRACT,
            V."targetId",
            SUM(
                CASE
                    WHEN V."isUpvote" THEN 1
                    ELSE 0
                END
            ) UPVOTES,
            SUM(
                CASE
                    WHEN V."isUpvote" THEN 0
                    ELSE 1
                END
            ) DOWNVOTES
        FROM
            PUBLIC.VOTES V
        WHERE
            V."isArchived" = FALSE
        GROUP BY
            CONTRACT,
            V."targetId"
    )
SELECT
    CASE
        WHEN UVE."eventId" > VE."eventId" THEN 'unvouch'
        ELSE 'vouch'
    END ACTIVITY_TYPE,
    'create' ACTIVITY_ACTION,
    V.ID,
    V."authorProfileId",
    V."subjectProfileId" || '' "subject",
    CASE
        WHEN UVE."eventId" > VE."eventId" THEN GREATEST(VE."eventId", UVE."eventId")
        ELSE LEAST(VE."eventId", UVE."eventId")
    END "eventId",
    V.COMMENT TITLE,
    V.ARCHIVED,
    CASE
        WHEN UVE."eventId" > VE."eventId" THEN V."unvouchedAt"
        ELSE V."vouchedAt"
    END "createdAt",
    V."updatedAt",
    V.METADATA,
    COALESCE(TV.UPVOTES, 0) UPVOTES,
    COALESCE(TV.DOWNVOTES, 0) DOWNVOTES,
    COALESCE(TR.REPLIES, 0) REPLIES
FROM
    PUBLIC.VOUCHES V
    JOIN PUBLIC.VOUCH_EVENTS VE ON VE."vouchId" = V.ID
    LEFT JOIN PUBLIC.VOUCH_EVENTS UVE ON UVE."vouchId" = V.ID
    AND UVE."eventId" <> VE."eventId"
    LEFT JOIN TOTAL_VOTES TV ON TV."targetId" = V.ID
    AND TV.CONTRACT = 'vouch'
    LEFT JOIN TOTAL_REPLIES TR ON TR."rootParentId" = V.ID
    AND TR.CONTRACT = 'vouch'
UNION ALL
SELECT
    'review' ACTIVITY_TYPE,
    'create' ACTIVITY_ACTION,
    R.ID,
    R."authorProfileId",
    CASE
        WHEN R.SERVICE = ''
        AND R.ACCOUNT = '' THEN R.SUBJECT
        ELSE CONCAT(R.SERVICE, ':', R.ACCOUNT)
    END "subject",
    RE."eventId",
    R.COMMENT TITLE,
    R.ARCHIVED,
    R."createdAt",
    R."updatedAt",
    R.METADATA,
    COALESCE(TV.UPVOTES, 0) UPVOTES,
    COALESCE(TV.DOWNVOTES, 0) DOWNVOTES,
    COALESCE(TR.REPLIES, 0) REPLIES
FROM
    PUBLIC.REVIEWS R
    JOIN PUBLIC.REVIEW_EVENTS RE ON RE."reviewId" = R.ID
    LEFT JOIN TOTAL_VOTES TV ON TV."targetId" = R.ID
    AND TV.CONTRACT = 'review'
    LEFT JOIN TOTAL_REPLIES TR ON TR."rootParentId" = R.ID
    AND TR.CONTRACT = 'review'
UNION ALL
SELECT
    'attestation' ACTIVITY_TYPE,
    'create' ACTIVITY_ACTION,
    A.ID,
    A."profileId" "authorProfileId",
    CONCAT(A.SERVICE, ':', A.ACCOUNT) "subject",
    AE."eventId",
    NULL TITLE,
    A.ARCHIVED,
    A."createdAt",
    A."updatedAt",
    NULL METADATA,
    COALESCE(TV.UPVOTES, 0) UPVOTES,
    COALESCE(TV.DOWNVOTES, 0) DOWNVOTES,
    COALESCE(TR.REPLIES, 0) REPLIES
FROM
    PUBLIC.ATTESTATIONS A
    JOIN PUBLIC.ATTESTATION_EVENTS AE ON AE."attestationId" = A.ID
    LEFT JOIN TOTAL_VOTES TV ON TV."targetId" = A.ID
    AND TV.CONTRACT = 'attestation'
    LEFT JOIN TOTAL_REPLIES TR ON TR."rootParentId" = A.ID
    AND TR.CONTRACT = 'attestation'
UNION ALL
(
    SELECT DISTINCT
        ON (P.ID) 'invitation-accepted' ACTIVITY_TYPE,
        'create' ACTIVITY_ACTION,
        I.ID,
        I."senderProfileId" "authorProfileId",
        P.ID || '' "subject",
        PE."eventId",
        NULL TITLE,
        P.ARCHIVED,
        I."sentAt" "createdAt",
        I."statusUpdatedAt" "updatedAt",
        NULL METADATA,
        COALESCE(TV.UPVOTES, 0) UPVOTES,
        COALESCE(TV.DOWNVOTES, 0) DOWNVOTES,
        COALESCE(TR.REPLIES, 0) REPLIES
    FROM
        PUBLIC.INVITATIONS I
        JOIN PUBLIC.PROFILES P ON P.ID = I."acceptedProfileId"
        JOIN PUBLIC.PROFILE_EVENTS PE ON PE."profileId" = P.ID
        LEFT JOIN TOTAL_VOTES TV ON TV."targetId" = P.ID
        AND TV.CONTRACT = 'profile'
        LEFT JOIN TOTAL_REPLIES TR ON TR."rootParentId" = P.ID
        AND TR.CONTRACT = 'profile'
    ORDER BY
        P.ID,
        "eventId"
)

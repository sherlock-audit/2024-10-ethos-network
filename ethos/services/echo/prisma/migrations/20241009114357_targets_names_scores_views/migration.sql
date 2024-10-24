---- targets
CREATE VIEW "targets" AS
SELECT
    ID,
    'profileId:' || ID::TEXT TARGET
FROM
    PROFILES P
UNION
SELECT
    P.ID,
    'address:' || LOWER(PA.ADDRESS) TARGET
FROM
    PROFILES P
    JOIN PROFILE_ADDRESSES PA ON PA."profileId" = P.ID
UNION
SELECT
    P.ID,
    'service:' || A.SERVICE || ':' || A.ACCOUNT::TEXT TARGET
FROM
    PROFILES P
    JOIN ATTESTATIONS A ON A."profileId" = P.ID;

---- names
CREATE VIEW "names" AS
WITH
    ENS_NAMES AS (
        SELECT
            PA."profileId" ID,
            'address:' || LOWER(PA.ADDRESS) TARGET,
            FIRST_VALUE(ENS."ensName") OVER (
                PARTITION BY
                    PA."profileId"
                ORDER BY
                    ENS."createdAt" DESC
            ) NAME,
            FIRST_VALUE(ENS."avatarUrl") OVER (
                PARTITION BY
                    PA."profileId"
                ORDER BY
                    ENS."createdAt" DESC
            ) AVATAR,
            NULL USERNAME,
            NULL DESCRIPTION
        FROM
            PROFILE_ADDRESSES PA
            LEFT JOIN ENS_CACHE ENS ON LOWER(PA.ADDRESS) = LOWER(ENS.ADDRESS)
        UNION
        SELECT -- when there are ens entries for non-users
            PA."profileId" ID,
            'address:' || LOWER(ENS.ADDRESS) TARGET,
            ENS."ensName" NAME,
            ENS."avatarUrl" AVATAR,
            NULL USERNAME,
            NULL DESCRIPTION
        FROM
            PROFILE_ADDRESSES PA
            RIGHT JOIN ENS_CACHE ENS ON LOWER(PA.ADDRESS) = LOWER(ENS.ADDRESS)
        WHERE
            PA.ID IS NULL
    ),
    TWITTER_NAMES AS (
        SELECT
            A."profileId" ID,
            'service:x.com:' || A.ACCOUNT::TEXT TARGET,
            FIRST_VALUE(TPC.NAME) OVER (
                PARTITION BY
                    A."profileId"
                ORDER BY
                    TPC."createdAt" DESC
            ) NAME,
            FIRST_VALUE(TPC.AVATAR) OVER (
                PARTITION BY
                    A."profileId"
                ORDER BY
                    TPC."createdAt" DESC
            ) AVATAR,
            FIRST_VALUE(TPC.USERNAME) OVER (
                PARTITION BY
                    A."profileId"
                ORDER BY
                    TPC."createdAt" DESC
            ) USERNAME,
            FIRST_VALUE(TPC.BIOGRAPHY) OVER (
                PARTITION BY
                    A."profileId"
                ORDER BY
                    TPC."createdAt" DESC
            ) DESCRIPTION
        FROM
            ATTESTATIONS A
            LEFT JOIN TWITTER_PROFILES_CACHE TPC ON TPC.ID = A.ACCOUNT
        WHERE
            A.ARCHIVED = FALSE
        UNION
        SELECT -- when there are entries for non-users
            A."profileId" ID,
            'service:x.com:' || TPC.ID::TEXT TARGET,
            TPC.NAME,
            TPC.AVATAR,
            TPC.USERNAME,
            TPC.BIOGRAPHY DESCRIPTION
        FROM
            ATTESTATIONS A
            RIGHT JOIN TWITTER_PROFILES_CACHE TPC ON TPC.ID = A.ACCOUNT
        WHERE
            A.ID IS NULL
    ),
    MORALIS_CACHE AS (
        SELECT
            THC."fromAddress" TARGET,
            THC."fromAddressLabel" NAME,
            THC."fromAddressLogo" AVATAR
        FROM
            TRANSACTION_HISTORY_CACHE THC
        UNION
        SELECT
            THC."toAddress" TARGET,
            THC."toAddressLabel" NAME,
            THC."toAddressLogo" AVATAR
        FROM
            TRANSACTION_HISTORY_CACHE THC
    ),
    MORALIS_NAMES AS (
        SELECT DISTINCT
            PA."profileId" ID,
            'address:' || LOWER(PA.ADDRESS) TARGET,
            FIRST_VALUE(MC.NAME) OVER (
                PARTITION BY
                    PA."profileId"
            ) NAME,
            FIRST_VALUE(MC.AVATAR) OVER (
                PARTITION BY
                    PA."profileId"
            ) AVATAR,
            NULL USERNAME,
            NULL DESCRIPTION
        FROM
            PROFILE_ADDRESSES PA
            LEFT JOIN MORALIS_CACHE MC ON LOWER(MC.TARGET) = LOWER(PA.ADDRESS)
        UNION
        SELECT DISTINCT -- when there are entries for non-users
            PA."profileId" ID,
            'address:' || LOWER(MC.TARGET) TARGET,
            MC.NAME,
            MC.AVATAR,
            NULL USERNAME,
            NULL DESCRIPTION
        FROM
            PROFILE_ADDRESSES PA
            RIGHT JOIN MORALIS_CACHE MC ON LOWER(MC.TARGET) = LOWER(PA.ADDRESS)
        WHERE
            PA.ID IS NULL
    ),
    NAME_UNION AS (
        SELECT
            *
        FROM
            ENS_NAMES
        UNION
        SELECT
            *
        FROM
            TWITTER_NAMES
        UNION
        SELECT
            *
        FROM
            MORALIS_NAMES
    ) (
        SELECT DISTINCT
            ON (N.ID) N.ID,
            COALESCE(ENS.TARGET, TWT.TARGET, MRLS.TARGET) TARGET,
            COALESCE(ENS.NAME, TWT.NAME, MRLS.NAME) NAME,
            COALESCE(ENS.AVATAR, TWT.AVATAR, MRLS.AVATAR) AVATAR,
            COALESCE(ENS.USERNAME, TWT.USERNAME, MRLS.USERNAME) USERNAME,
            COALESCE(
                ENS.DESCRIPTION,
                TWT.DESCRIPTION,
                MRLS.DESCRIPTION
            ) DESCRIPTION
        FROM
            NAME_UNION N
            LEFT JOIN ENS_NAMES ENS ON ENS.ID = N.ID
            LEFT JOIN TWITTER_NAMES TWT ON TWT.ID = N.ID
            LEFT JOIN MORALIS_NAMES MRLS ON MRLS.ID = N.ID
        WHERE
            N.ID IS NOT NULL
        ORDER BY
            N.ID
    )
UNION
(
    SELECT DISTINCT
        ON (N.TARGET) -- names for non-users
        N.ID,
        COALESCE(ENS.TARGET, TWT.TARGET, MRLS.TARGET) TARGET,
        COALESCE(ENS.NAME, TWT.NAME, MRLS.NAME) NAME,
        COALESCE(ENS.AVATAR, TWT.AVATAR, MRLS.AVATAR) AVATAR,
        COALESCE(ENS.USERNAME, TWT.USERNAME, MRLS.USERNAME) USERNAME,
        COALESCE(
            ENS.DESCRIPTION,
            TWT.DESCRIPTION,
            MRLS.DESCRIPTION
        ) DESCRIPTION
    FROM
        NAME_UNION N
        LEFT JOIN ENS_NAMES ENS ON ENS.TARGET = N.TARGET
        LEFT JOIN TWITTER_NAMES TWT ON TWT.TARGET = N.TARGET
        LEFT JOIN MORALIS_NAMES MRLS ON MRLS.TARGET = N.TARGET
    WHERE
        N.ID IS NULL
    ORDER BY
        N.TARGET
);

---- scores
CREATE VIEW "scores" AS
WITH    SCORE_TARGETS AS (
        SELECT DISTINCT
            ON (TARGET) LOWER(TARGET) TARGET,
            SCORE,
            "createdAt"
        FROM
            SCORE_HISTORY
        ORDER BY
            TARGET,
            "createdAt" DESC
    )
        (
            SELECT DISTINCT
                ON (T.ID) T.ID,
                T.TARGET,
                FIRST_VALUE(SCORE) OVER (
                    PARTITION BY
                        T.ID
                    ORDER BY
                        ST."createdAt" DESC
                ) SCORE
            FROM
                TARGETS T
                JOIN SCORE_TARGETS ST ON LOWER(ST.TARGET) = LOWER(T.TARGET)
            ORDER BY
                T.ID
        )
        UNION
        (
            SELECT -- scores for non-users
                T.ID,
                ST.TARGET,
                SCORE
            FROM
                TARGETS T
                RIGHT JOIN SCORE_TARGETS ST ON LOWER(ST.TARGET) = LOWER(T.TARGET)
            WHERE
                T.ID IS NULL
        )


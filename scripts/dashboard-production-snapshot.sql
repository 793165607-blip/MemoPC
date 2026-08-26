WITH
params AS (
    SELECT
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date AS today,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::date - 1 AS sustained_analysis_date,
        CURRENT_TIMESTAMP AS generated_at
),
user_rows AS (
    -- users.id is the canonical identity; UnionID can change from mp:<openId> to a real UnionID.
    SELECT
        id,
        'user:' || id AS sender_key,
        NULLIF(BTRIM(open_id), '') AS open_id,
        NULLIF(BTRIM(union_id), '') AS union_id,
        created_at AS registration_at,
        (created_at AT TIME ZONE 'Asia/Shanghai')::date AS registration_date
    FROM users
    WHERE created_at IS NOT NULL
),
identity_registration AS (
    SELECT sender_key, registration_at, registration_date
    FROM user_rows
),
message_rows AS (
    SELECT
        COALESCE(
            open_identity.sender_key,
            union_identity.sender_key,
            CASE
                WHEN NULLIF(BTRIM(records.union_id), '') IS NOT NULL
                    THEN 'union:' || BTRIM(records.union_id)
                WHEN NULLIF(BTRIM(records.open_id), '') IS NOT NULL
                    THEN 'open:' || BTRIM(records.open_id)
                ELSE NULL
            END
        ) AS sender_key,
        records.started_at AS activity_at,
        (records.started_at AT TIME ZONE 'Asia/Shanghai')::date AS activity_date,
        UPPER(COALESCE(NULLIF(BTRIM(records.content_type), ''), 'TEXT')) AS content_type
    FROM chat_record records
    CROSS JOIN params
    -- Prefer the stable mini-program OpenID mapping, then current/fallback UnionID.
    LEFT JOIN LATERAL (
        SELECT candidate.id, candidate.sender_key
        FROM user_rows candidate
        WHERE candidate.open_id = NULLIF(BTRIM(records.open_id), '')
        ORDER BY candidate.registration_at, candidate.id
        LIMIT 1
    ) open_identity ON TRUE
    LEFT JOIN LATERAL (
        SELECT candidate.sender_key
        FROM user_rows candidate
        WHERE candidate.union_id = NULLIF(BTRIM(records.union_id), '')
           OR NULLIF(BTRIM(records.union_id), '') = 'mp:' || candidate.open_id
        ORDER BY
            CASE
                WHEN candidate.union_id = NULLIF(BTRIM(records.union_id), '') THEN 0
                ELSE 1
            END,
            candidate.registration_at,
            candidate.id
        LIMIT 1
    ) union_identity ON open_identity.id IS NULL
    WHERE records.message_count > 0
      AND COALESCE(records.role, 'user') = 'user'
      AND records.started_at IS NOT NULL
      AND (records.started_at AT TIME ZONE 'Asia/Shanghai')::date <= params.today
      AND UPPER(COALESCE(NULLIF(BTRIM(records.content_type), ''), 'TEXT'))
          IN ('TEXT', 'IMAGE', 'VOICE', 'VIDEO')
),
activity_days AS (
    SELECT DISTINCT sender_key, activity_date
    FROM message_rows
    WHERE sender_key IS NOT NULL
),
highlight_rows AS (
    SELECT
        COALESCE(
            open_identity.sender_key,
            union_identity.sender_key,
            CASE
                WHEN NULLIF(BTRIM(highlights.union_id), '') IS NOT NULL
                    THEN 'union:' || BTRIM(highlights.union_id)
                WHEN NULLIF(BTRIM(highlights.open_id), '') IS NOT NULL
                    THEN 'open:' || BTRIM(highlights.open_id)
                ELSE NULL
            END
        ) AS sender_key,
        highlights.created_at AS behavior_at,
        (highlights.created_at AT TIME ZONE 'Asia/Shanghai')::date AS behavior_date
    FROM highlight_moment_generation highlights
    CROSS JOIN params
    -- Highlight tasks carry both keys, so use the same OpenID-first bridge as messages.
    LEFT JOIN LATERAL (
        SELECT candidate.id, candidate.sender_key
        FROM user_rows candidate
        WHERE candidate.open_id = NULLIF(BTRIM(highlights.open_id), '')
        ORDER BY candidate.registration_at, candidate.id
        LIMIT 1
    ) open_identity ON TRUE
    LEFT JOIN LATERAL (
        SELECT candidate.sender_key
        FROM user_rows candidate
        WHERE candidate.union_id = NULLIF(BTRIM(highlights.union_id), '')
           OR NULLIF(BTRIM(highlights.union_id), '') = 'mp:' || candidate.open_id
        ORDER BY
            CASE
                WHEN candidate.union_id = NULLIF(BTRIM(highlights.union_id), '') THEN 0
                ELSE 1
            END,
            candidate.registration_at,
            candidate.id
        LIMIT 1
    ) union_identity ON open_identity.id IS NULL
    WHERE highlights.status = 'SUCCEEDED'
      AND highlights.result_object_key IS NOT NULL
      AND (highlights.created_at AT TIME ZONE 'Asia/Shanghai')::date <= params.today
),
highlight_daily AS (
    SELECT behavior_date AS day, COUNT(*) AS count
    FROM highlight_rows
    GROUP BY behavior_date
),
echo_rows AS (
    SELECT
        COALESCE(
            union_identity.sender_key,
            CASE
                WHEN NULLIF(BTRIM(echo.union_id), '') IS NOT NULL
                    THEN 'union:' || BTRIM(echo.union_id)
                ELSE NULL
            END
        ) AS sender_key,
        echo.period_start,
        COALESCE(echo.generated_at, echo.gmt_created) AS generated_at,
        (COALESCE(echo.generated_at, echo.gmt_created) AT TIME ZONE 'Asia/Shanghai')::date AS generated_date
    FROM user_diary_echo echo
    CROSS JOIN params
    LEFT JOIN LATERAL (
        SELECT candidate.sender_key
        FROM user_rows candidate
        WHERE candidate.union_id = NULLIF(BTRIM(echo.union_id), '')
           OR NULLIF(BTRIM(echo.union_id), '') = 'mp:' || candidate.open_id
        ORDER BY
            CASE
                WHEN candidate.union_id = NULLIF(BTRIM(echo.union_id), '') THEN 0
                ELSE 1
            END,
            candidate.registration_at,
            candidate.id
        LIMIT 1
    ) union_identity ON TRUE
    WHERE echo.scene = 'DAILY'
      AND (COALESCE(echo.generated_at, echo.gmt_created) AT TIME ZONE 'Asia/Shanghai')::date <= params.today
),
new_user_message_daily AS (
    SELECT
        identity.registration_date AS day,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE messages.content_type = 'TEXT') AS text,
        COUNT(*) FILTER (WHERE messages.content_type = 'IMAGE') AS image,
        COUNT(*) FILTER (WHERE messages.content_type = 'VOICE') AS voice,
        COUNT(*) FILTER (WHERE messages.content_type = 'VIDEO') AS video
    FROM identity_registration identity
    JOIN message_rows messages
      ON messages.sender_key = identity.sender_key
     AND messages.activity_date = identity.registration_date
     AND messages.activity_at >= identity.registration_at
    GROUP BY identity.registration_date
),
new_user_echo_daily AS (
    SELECT identity.registration_date AS day, COUNT(*) AS count
    FROM identity_registration identity
    JOIN echo_rows echo
      ON echo.sender_key = identity.sender_key
     AND echo.period_start = identity.registration_date
     AND echo.generated_at >= identity.registration_at
    GROUP BY identity.registration_date
),
new_user_highlight_daily AS (
    SELECT identity.registration_date AS day, COUNT(*) AS count
    FROM identity_registration identity
    JOIN highlight_rows highlights
      ON highlights.sender_key = identity.sender_key
     AND highlights.behavior_date = identity.registration_date
     AND highlights.behavior_at >= identity.registration_at
    GROUP BY identity.registration_date
),
echo_daily AS (
    SELECT generated_date AS day, COUNT(*) AS count
    FROM echo_rows
    GROUP BY generated_date
),
data_bounds AS (
    SELECT COALESCE(MIN(event_date), params.today) AS data_start_date
    FROM params
    LEFT JOIN LATERAL (
        SELECT registration_date AS event_date FROM user_rows
        UNION ALL
        SELECT activity_date FROM message_rows
        UNION ALL
        SELECT day FROM highlight_daily
        UNION ALL
        SELECT day FROM echo_daily
    ) events ON TRUE
    GROUP BY params.today
),
sustained_anchors AS (
    SELECT GENERATE_SERIES(
        data_bounds.data_start_date + 27,
        params.sustained_analysis_date,
        INTERVAL '1 day'
    )::date AS anchor_date
    FROM data_bounds
    CROSS JOIN params
),
rolling_user_windows AS (
    SELECT
        anchors.anchor_date,
        identity.sender_key,
        COUNT(*) AS active_days,
        COUNT(*) FILTER (
            WHERE activity.activity_date BETWEEN anchors.anchor_date - 1 AND anchors.anchor_date
        ) AS recent_two_day_count
    FROM sustained_anchors anchors
    JOIN identity_registration identity
      ON identity.registration_date <= anchors.anchor_date - 27
    JOIN activity_days activity
      ON activity.sender_key = identity.sender_key
     AND activity.activity_date BETWEEN anchors.anchor_date - 27 AND anchors.anchor_date
    GROUP BY anchors.anchor_date, identity.sender_key
),
rolling_sustained_users AS (
    SELECT windows.anchor_date, windows.sender_key
    FROM rolling_user_windows windows
    WHERE windows.active_days >= 24
      AND windows.recent_two_day_count >= 1
      AND NOT EXISTS (
          SELECT 1
          FROM GENERATE_SERIES(0, 25) AS gap(offset_days)
          WHERE NOT EXISTS (
              SELECT 1
              FROM activity_days activity
              WHERE activity.sender_key = windows.sender_key
                AND activity.activity_date BETWEEN
                    windows.anchor_date - 27 + gap.offset_days
                    AND windows.anchor_date - 25 + gap.offset_days
          )
      )
),
rolling_sustained_summary AS (
    SELECT
        anchors.anchor_date,
        (
            SELECT COUNT(*)
            FROM rolling_user_windows eligible
            WHERE eligible.anchor_date = anchors.anchor_date
        ) AS eligible_users,
        (
            SELECT COUNT(*)
            FROM rolling_sustained_users current_users
            WHERE current_users.anchor_date = anchors.anchor_date
        ) AS continuous_users,
        (
            SELECT COUNT(*)
            FROM rolling_sustained_users current_users
            WHERE current_users.anchor_date = anchors.anchor_date
              AND NOT EXISTS (
                  SELECT 1
                  FROM rolling_sustained_users previous_users
                  WHERE previous_users.anchor_date = anchors.anchor_date - 1
                    AND previous_users.sender_key = current_users.sender_key
              )
        ) AS new_continuous_users,
        (
            SELECT COUNT(*)
            FROM rolling_sustained_users previous_users
            WHERE previous_users.anchor_date = anchors.anchor_date - 1
              AND NOT EXISTS (
                  SELECT 1
                  FROM rolling_sustained_users current_users
                  WHERE current_users.anchor_date = anchors.anchor_date
                    AND current_users.sender_key = previous_users.sender_key
              )
        ) AS exited_continuous_users
    FROM sustained_anchors anchors
),
current_sustained_users AS (
    SELECT users.sender_key
    FROM rolling_sustained_users users
    CROSS JOIN params
    WHERE users.anchor_date = params.sustained_analysis_date
),
continuous_usage_summary AS (
    SELECT
        params.sustained_analysis_date AS as_of_date,
        COALESCE(summary.continuous_users, 0) AS continuous_users,
        COALESCE(summary.eligible_users, 0) AS eligible_users,
        COALESCE(summary.new_continuous_users, 0) AS new_continuous_users,
        COALESCE(summary.exited_continuous_users, 0) AS exited_continuous_users,
        COUNT(messages.sender_key) AS messages_total,
        COUNT(messages.sender_key) FILTER (WHERE messages.content_type = 'TEXT') AS messages_text,
        COUNT(messages.sender_key) FILTER (WHERE messages.content_type = 'IMAGE') AS messages_image,
        COUNT(messages.sender_key) FILTER (WHERE messages.content_type = 'VOICE') AS messages_voice,
        COUNT(messages.sender_key) FILTER (WHERE messages.content_type = 'VIDEO') AS messages_video
    FROM params
    LEFT JOIN rolling_sustained_summary summary
      ON summary.anchor_date = params.sustained_analysis_date
    LEFT JOIN current_sustained_users users ON TRUE
    LEFT JOIN message_rows messages
      ON messages.sender_key = users.sender_key
     AND messages.activity_date BETWEEN params.sustained_analysis_date - 27 AND params.sustained_analysis_date
    GROUP BY
        params.sustained_analysis_date,
        summary.continuous_users,
        summary.eligible_users,
        summary.new_continuous_users,
        summary.exited_continuous_users
),
days AS (
    SELECT GENERATE_SERIES(
        data_bounds.data_start_date,
        params.today,
        INTERVAL '1 day'
    )::date AS day
    FROM data_bounds
    CROSS JOIN params
),
registration_daily AS (
    SELECT registration_date AS day, COUNT(*) AS count
    FROM user_rows
    GROUP BY registration_date
),
message_daily AS (
    SELECT
        activity_date AS day,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE content_type = 'TEXT') AS text,
        COUNT(*) FILTER (WHERE content_type = 'IMAGE') AS image,
        COUNT(*) FILTER (WHERE content_type = 'VOICE') AS voice,
        COUNT(*) FILTER (WHERE content_type = 'VIDEO') AS video
    FROM message_rows
    GROUP BY activity_date
),
active_daily AS (
    SELECT activity_date AS day, COUNT(*) AS active_users
    FROM activity_days
    GROUP BY activity_date
),
activation_per_user AS (
    SELECT
        users.id,
        users.sender_key,
        users.registration_date,
        COALESCE(BOOL_OR(activity.activity_date = users.registration_date), FALSE) AS same_day,
        COUNT(DISTINCT activity.activity_date) FILTER (
            WHERE activity.activity_date BETWEEN users.registration_date AND users.registration_date + 6
        ) AS first_seven_day_count
    FROM user_rows users
    CROSS JOIN params
    LEFT JOIN message_rows activity
      ON activity.sender_key = users.sender_key
     AND activity.activity_at >= users.registration_at
    WHERE users.sender_key IS NOT NULL
    GROUP BY users.id, users.sender_key, users.registration_date
),
activation_cohorts AS (
    SELECT
        registration_date,
        -- Only completed Beijing natural days enter finalized activation rates.
        COUNT(*) FILTER (WHERE registration_date < params.today) AS same_day_denominator,
        COUNT(*) FILTER (
            WHERE registration_date < params.today AND same_day
        ) AS same_day_numerator,
        COUNT(*) FILTER (WHERE registration_date + 7 <= params.today) AS seven_day_denominator,
        COUNT(*) FILTER (
            WHERE registration_date + 7 <= params.today AND first_seven_day_count >= 2
        ) AS seven_day_numerator
    FROM activation_per_user
    CROSS JOIN params
    GROUP BY registration_date
),
activated_users AS (
    SELECT
        id,
        sender_key,
        registration_date
    FROM activation_per_user
    WHERE same_day
),
retention_sizes AS (
    SELECT
        registration_date AS cohort_date,
        COUNT(DISTINCT id) AS denominator
    FROM activated_users
    GROUP BY registration_date
),
retention_counts AS (
    SELECT
        users.registration_date AS cohort_date,
        (activity.activity_date - users.registration_date)::integer AS day_number,
        COUNT(DISTINCT users.id) AS numerator
    FROM activated_users users
    JOIN activity_days activity
      ON activity.sender_key = users.sender_key
     AND activity.activity_date BETWEEN users.registration_date + 1 AND users.registration_date + 30
    GROUP BY users.registration_date, activity.activity_date - users.registration_date
),
daily_retention_cohorts AS (
    SELECT
        days.day AS cohort_date,
        COALESCE(retention_sizes.denominator, 0) AS denominator,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'day', observation.day_number,
                'numerator', COALESCE(retention_counts.numerator, 0)
            ) ORDER BY observation.day_number
        ) AS points
    FROM days
    CROSS JOIN params
    CROSS JOIN GENERATE_SERIES(1, 30) AS observation(day_number)
    LEFT JOIN retention_sizes
      ON retention_sizes.cohort_date = days.day
    LEFT JOIN retention_counts
      ON retention_counts.cohort_date = days.day
     AND retention_counts.day_number = observation.day_number
    WHERE days.day < params.today
      AND observation.day_number <= LEAST(30, params.today - days.day)
    GROUP BY days.day, retention_sizes.denominator
),
daily_rows AS (
    SELECT
        days.day,
        COALESCE(registration_daily.count, 0) AS registrations,
        COALESCE(active_daily.active_users, 0) AS active_users,
        COALESCE(message_daily.total, 0) AS messages_total,
        COALESCE(message_daily.text, 0) AS messages_text,
        COALESCE(message_daily.image, 0) AS messages_image,
        COALESCE(message_daily.voice, 0) AS messages_voice,
        COALESCE(message_daily.video, 0) AS messages_video,
        COALESCE(highlight_daily.count, 0) AS highlight_images,
        COALESCE(echo_daily.count, 0) AS daily_echoes,
        COALESCE(new_user_message_daily.total, 0) AS new_user_messages_total,
        COALESCE(new_user_message_daily.text, 0) AS new_user_messages_text,
        COALESCE(new_user_message_daily.image, 0) AS new_user_messages_image,
        COALESCE(new_user_message_daily.voice, 0) AS new_user_messages_voice,
        COALESCE(new_user_message_daily.video, 0) AS new_user_messages_video,
        COALESCE(new_user_echo_daily.count, 0) AS new_user_daily_echoes,
        COALESCE(new_user_highlight_daily.count, 0) AS new_user_highlight_images,
        DATE_TRUNC('week', days.day)::date AS week_start,
        (
            SELECT COUNT(DISTINCT activity.sender_key)
            FROM activity_days activity
            WHERE activity.activity_date BETWEEN DATE_TRUNC('week', days.day)::date AND days.day
        ) AS record_wau,
        (
            SELECT COUNT(*)
            FROM (
                SELECT activity.sender_key
                FROM activity_days activity
                WHERE activity.activity_date BETWEEN DATE_TRUNC('week', days.day)::date AND days.day
                GROUP BY activity.sender_key
                HAVING COUNT(*) >= 2
            ) effective
        ) AS weekly_effective_users,
        (
            SELECT COUNT(*)
            FROM activity_days activity
            WHERE activity.activity_date BETWEEN DATE_TRUNC('week', days.day)::date AND days.day
        ) AS weekly_user_days
    FROM days
    LEFT JOIN registration_daily ON registration_daily.day = days.day
    LEFT JOIN message_daily ON message_daily.day = days.day
    LEFT JOIN active_daily ON active_daily.day = days.day
    LEFT JOIN highlight_daily ON highlight_daily.day = days.day
    LEFT JOIN echo_daily ON echo_daily.day = days.day
    LEFT JOIN new_user_message_daily ON new_user_message_daily.day = days.day
    LEFT JOIN new_user_echo_daily ON new_user_echo_daily.day = days.day
    LEFT JOIN new_user_highlight_daily ON new_user_highlight_daily.day = days.day
)
SELECT jsonb_build_object(
    'schemaVersion', 4,
    'generatedAt', TO_CHAR(params.generated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'timezone', 'Asia/Shanghai',
    'dataStartDate', data_bounds.data_start_date,
    'throughDate', params.today,
    'sustainedUsage', jsonb_build_object(
        'asOfDate', continuous_usage_summary.as_of_date,
        'continuous28DayUsers', continuous_usage_summary.continuous_users,
        'eligibleUsers', continuous_usage_summary.eligible_users,
        'newContinuousUsers', continuous_usage_summary.new_continuous_users,
        'exitedContinuousUsers', continuous_usage_summary.exited_continuous_users,
        'messages', jsonb_build_object(
            'total', continuous_usage_summary.messages_total,
            'text', continuous_usage_summary.messages_text,
            'image', continuous_usage_summary.messages_image,
            'voice', continuous_usage_summary.messages_voice,
            'video', continuous_usage_summary.messages_video
        ),
        'dailyTrend', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'date', trend.anchor_date,
                'continuousUsers', trend.continuous_users,
                'eligibleUsers', trend.eligible_users,
                'newContinuousUsers', trend.new_continuous_users,
                'exitedContinuousUsers', trend.exited_continuous_users
            ) ORDER BY trend.anchor_date)
            FROM rolling_sustained_summary trend
        ), '[]'::jsonb)
    ),
    'daily', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'date', daily_rows.day,
            'registrations', daily_rows.registrations,
            'activeUsers', daily_rows.active_users,
            'messages', jsonb_build_object(
                'total', daily_rows.messages_total,
                'text', daily_rows.messages_text,
                'image', daily_rows.messages_image,
                'voice', daily_rows.messages_voice,
                'video', daily_rows.messages_video
            ),
            'highlightImages', daily_rows.highlight_images,
            'dailyEchoes', daily_rows.daily_echoes,
            'newUserBehavior', jsonb_build_object(
                'messages', jsonb_build_object(
                    'total', daily_rows.new_user_messages_total,
                    'text', daily_rows.new_user_messages_text,
                    'image', daily_rows.new_user_messages_image,
                    'voice', daily_rows.new_user_messages_voice,
                    'video', daily_rows.new_user_messages_video
                ),
                'highlightImages', daily_rows.new_user_highlight_images,
                'dailyEchoes', daily_rows.new_user_daily_echoes
            ),
            'weekStart', daily_rows.week_start,
            'recordWau', daily_rows.record_wau,
            'weeklyEffectiveUsers', daily_rows.weekly_effective_users,
            'weeklyUserDays', daily_rows.weekly_user_days
        ) ORDER BY daily_rows.day)
        FROM daily_rows
    ), '[]'::jsonb),
    'activationCohorts', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'registrationDate', activation_cohorts.registration_date,
            'sameDayNumerator', activation_cohorts.same_day_numerator,
            'sameDayDenominator', activation_cohorts.same_day_denominator,
            'sevenDayNumerator', activation_cohorts.seven_day_numerator,
            'sevenDayDenominator', activation_cohorts.seven_day_denominator
        ) ORDER BY activation_cohorts.registration_date)
        FROM activation_cohorts
    ), '[]'::jsonb),
    'dailyRetentionCohorts', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'cohortDate', daily_retention_cohorts.cohort_date,
            'denominator', daily_retention_cohorts.denominator,
            'points', daily_retention_cohorts.points
        ) ORDER BY daily_retention_cohorts.cohort_date)
        FROM daily_retention_cohorts
    ), '[]'::jsonb)
)::text AS dashboard_snapshot
FROM params
CROSS JOIN data_bounds
CROSS JOIN continuous_usage_summary;

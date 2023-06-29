SELECT
    value:index,
    value:score
FROM
    TABLE(
        FLATTEN(
            input => PARSE_JSON('[{"index": 1, "score": 100}, {"index": 2, "score": 200}]')
        )
    );

select 
    TO_DECIMAL('12.3456', 10, 1),
    TO_DECIMAL(12.3456, 10, 1),
    TO_DECIMAL(to_variant(12.3456), 10, 1),
    TO_DECIMAL('12.3', '99.9', 9, 5)

import re
from typing import Tuple, Optional


def detect_and_set_dialect_for_backticks(sql_query: str, sql_dialect: str = 'default') -> str:
    """
    Detect backticks in SQL query and automatically set MySQL dialect if needed.

    This function checks if the SQL query contains backtick-enclosed identifiers
    and if so, ensures that the MySQL dialect is used for proper parsing.

    Args:
        sql_query (str): The original SQL query
        sql_dialect (str): The SQL dialect ('mysql', 'postgresql', 'default', etc.)

    Returns:
        str: The appropriate SQL dialect to use
    """
    if sql_dialect != 'default':
        # If user explicitly specified a dialect, use it as-is
        return sql_dialect

    # Check if query contains backticks (but not inside string literals)
    has_backticks = False
    in_single_quote = False
    in_double_quote = False

    for char in sql_query:
        if char == "'" and not in_double_quote:
            in_single_quote = not in_single_quote
        elif char == '"' and not in_single_quote:
            in_double_quote = not in_double_quote
        elif char == '`' and not in_single_quote and not in_double_quote:
            has_backticks = True
            break

    if has_backticks:
        # Auto-detect MySQL dialect when backticks are present
        return 'mysql'

    return sql_dialect


def test_backtick_preprocessing():
    """Test function for backtick preprocessing."""
    test_cases = [
        # MySQL cases
        ("SELECT `name` FROM `users`", "mysql"),
        ("SELECT `user`.`name` FROM `user` WHERE `user`.`id` = 1", "mysql"),
        ("INSERT INTO `orders` (`id`, `customer_id`) VALUES (1, 2)", "mysql"),
        ("CREATE TABLE `test_table` (`id` INT, `name` VARCHAR(255))", "mysql"),

        # Non-MySQL cases
        ("SELECT `name` FROM `users`", "postgresql"),
        ("SELECT `user`.`name` FROM `user`", "default"),

        # Edge cases
        ("SELECT 'hello `world`' as `message`", "mysql"),  # backtick in string literal
        ("SELECT \"hello `world`\" as `message`", "mysql"),  # backtick in double quoted string
        ("SELECT `column with spaces` FROM `table name`", "mysql"),
    ]

    for sql, dialect in test_cases:
        processed, changed = preprocess_sql_backticks(sql, dialect)
        print(f"Original ({dialect}): {sql}")
        print(f"Processed: {processed}")
        print(f"Changed: {changed}")
        print("-" * 50)


if __name__ == "__main__":
    test_backtick_preprocessing()
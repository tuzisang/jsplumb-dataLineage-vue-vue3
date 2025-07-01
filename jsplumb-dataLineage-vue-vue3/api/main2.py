def get_lineage_json_from_parsed_output(sql_query, include_intermediate_tables=False, filter_ctes=False):
    """
    Parse SQL and return lineage information as JSON
    
    Args:
        sql_query (str): SQL query to analyze
        include_intermediate_tables (bool): Whether to include intermediate tables
        filter_ctes (bool): Whether to filter CTEs
        
    Returns:
        dict: Lineage information in JSON format
    """
    runner = LineageRunner(
        sql=sql_query,
        verbose=False
    )
    
    # Get the lineage result
    result = runner.analyze()
    
    # Convert to JSON format
    # TODO: Implement the actual conversion logic using include_intermediate_tables and filter_ctes parameters
    return {
        "nodes": [],
        "edges": []
    } 
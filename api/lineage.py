from http.server import BaseHTTPRequestHandler
import json
import traceback
import sys
from main2 import get_lineage_json_from_parsed_output
from table_lineage import get_table_lineage_json  # 新增导入

def analyze_sql_lineage(data):
    """
    SQL血缘分析API接口
    
    请求体JSON格式:
    {
        "sql_query": "SQL查询语句",
        "include_intermediate_tables": true/false,  # 可选，默认false
        "filter_ctes": true/false,  # 可选，默认false
        "lineage_level": "table"/"column"  # 可选，默认"column"
    }
    
    返回:
        JSON格式的血缘关系数据
    """
    try:
        if not data or 'sql_query' not in data:
            return {
                'error': 'Missing required parameter: sql_query'
            }, 400
            
        # 获取参数
        sql_query = data['sql_query']
        include_intermediate_tables = data.get('include_intermediate_tables', True)
        filter_ctes = data.get('filter_ctes', True)
        lineage_level = data.get('lineage_level', 'column')  # 新增参数
        
        print(f"Processing SQL query: {sql_query}")
        print(f"Parameters: include_intermediate_tables={include_intermediate_tables}, filter_ctes={filter_ctes}, lineage_level={lineage_level}")
        
        # 根据分析级别调用相应的函数
        if lineage_level == 'table':
            result = get_table_lineage_json(
                sql_query=sql_query,
                include_intermediate_tables=include_intermediate_tables,
                filter_ctes=filter_ctes
            )
        else:  # column level
            result = get_lineage_json_from_parsed_output(
                sql_query=sql_query,
                include_intermediate_tables=include_intermediate_tables,
                filter_ctes=filter_ctes
            )
        
        print(f"Analysis completed successfully")
        return result, 200
        
    except Exception as e:
        print("Error in analyze_sql_lineage:", file=sys.stderr)
        traceback.print_exc()
        return {
            'error': str(e)
        }, 500

def handler(request):
    """
    Vercel Serverless Function handler
    """
    print("Request received:", request.method)  # 添加请求方法日志
    
    # 处理 OPTIONS 请求
    if request.method == 'OPTIONS':
        print("Handling OPTIONS request")  # 添加 OPTIONS 请求日志
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    # 处理 POST 请求
    if request.method == 'POST':
        try:
            print("Handling POST request")  # 添加 POST 请求日志
            # 获取请求体
            body = json.loads(request.body)
            print("Request body:", body)  # 添加请求体日志
            
            # 分析 SQL
            result, status_code = analyze_sql_lineage(body)
            print("Analysis result:", result)  # 添加分析结果日志
            
            # 设置响应头
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            }
            
            # 返回响应
            response = {
                'statusCode': status_code,
                'headers': headers,
                'body': json.dumps(result)
            }
            print("Sending response:", response)  # 添加响应日志
            return response
            
        except Exception as e:
            print("Error in handler:", str(e))  # 添加错误日志
            print("Error details:", file=sys.stderr)
            traceback.print_exc()
            
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            }
            
            error_response = {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': str(e)})
            }
            print("Sending error response:", error_response)  # 添加错误响应日志
            return error_response

    # 处理其他请求方法
    print(f"Unsupported method: {request.method}")  # 添加不支持的方法日志
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'error': 'Method not allowed'})
    } 
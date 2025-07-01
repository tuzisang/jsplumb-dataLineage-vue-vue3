from http.server import BaseHTTPRequestHandler
import json
import traceback
import sys
from main2 import get_lineage_json_from_parsed_output

def analyze_sql_lineage(data):
    """
    SQL血缘分析API接口
    
    请求体JSON格式:
    {
        "sql_query": "SQL查询语句",
        "include_intermediate_tables": true/false,  # 可选，默认false
        "filter_ctes": true/false  # 可选，默认false
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
        
        print(f"Processing SQL query: {sql_query}")
        print(f"Parameters: include_intermediate_tables={include_intermediate_tables}, filter_ctes={filter_ctes}")
        
        # 调用血缘分析函数
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

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """测试路由"""
        if self.path == '/api/test':
            try:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {'status': 'ok', 'message': 'API server is running'}
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self._send_error(500, f"Test route error: {str(e)}")
        else:
            self._send_error(404, "Not found")

    def do_POST(self):
        try:
            if self.path != '/api/lineage':
                self._send_error(404, "Not found")
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error(400, "Empty request body")
                return

            post_data = self.rfile.read(content_length).decode('utf-8')
            print(f"Received POST data: {post_data}")
            
            try:
                data = json.loads(post_data)
            except json.JSONDecodeError as e:
                self._send_error(400, f"Invalid JSON format: {str(e)}")
                return

            result, status_code = analyze_sql_lineage(data)
            
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response_json = json.dumps(result)
            print(f"Sending response: {response_json}")
            self.wfile.write(response_json.encode('utf-8'))
            
        except Exception as e:
            print("Error in do_POST:", file=sys.stderr)
            traceback.print_exc()
            self._send_error(500, f"Internal server error: {str(e)}")
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _send_error(self, status_code, message):
        try:
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = json.dumps({'error': message})
            print(f"Sending error response: {error_response}")
            self.wfile.write(error_response.encode('utf-8'))
        except Exception as e:
            print("Error in _send_error:", file=sys.stderr)
            traceback.print_exc() 
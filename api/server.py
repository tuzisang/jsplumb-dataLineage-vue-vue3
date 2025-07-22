from flask import Flask, request, jsonify
from flask_cors import CORS
from lineage import analyze_sql_lineage

app = Flask(__name__)
CORS(app)

@app.route('/api/lineage', methods=['POST'])
def handle_lineage():
    try:
        data = request.get_json()
        if not data or 'sql_query' not in data:
            return jsonify({'error': 'Missing SQL query'}), 400
            
        result, status_code = analyze_sql_lineage(data)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    # 简单账号密码校验，生产环境请用数据库和加密
    if username == 'tzz' and password == '2302200':
        return jsonify({'token': 'demo_token', 'username': username}), 200
    else:
        return jsonify({'error': '账号或密码错误'}), 401

if __name__ == '__main__':
    app.run(port=5000) 